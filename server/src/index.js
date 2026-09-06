/**
 * index.js — API server Sales Analytics Dashboard (port 3001)
 * Endpoints: auth, orders, products, analytics, balance, upgrades, payments (VietQR + webhook), admin, chat AI
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  getUser, getUsers, createUser, updateUser, deleteUser, renameUserEmail,
  getPurchases, addPurchase,
  getOrders, createOrder, updateOrderStatus, getOrder,
  listProducts, getProductById, bookSlots,
  createTransaction, getTotalTopup,
  createPaymentRequest, getPaymentRequest, markPaymentPaid, expireStalePayments,
  listPayments, findPendingPaymentByContent, getUserByUserCode,
  getSetting, setSetting, addWebhookLog, getWebhookLogs,
  getChatMessages, addChatMessage, clearChatMessages,
  nextUserCode,
} from './db.js';
import { getAnalytics, getDailyRevenue } from './analytics.js';
import { genPaymentContent, publicPayment, BANK } from './payments.js';
import { connectRealtimeBridge, broadcast } from './realtime.js';
import { creditTopup, publicUser, getVipTier } from './helpers.js';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_7D = '7d';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- helpers ----------
const reqIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
function sign(user) {
  return jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_7D });
}
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUser(payload.email);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    req.user = { email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
  }
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên' });
  next();
}
const broadcastUserUpdated = (email, actor) => {
  const u = getUser(email);
  if (u) broadcast(`user:${email}`, 'user:updated', { email, reason: 'admin-edit', actor: actor || email, user: publicUser(u) });
};

// Mã xác thực tạm thời (demo — in log, trả devCode)
const verifyCodes = new Map();
function genVerifyCode(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  verifyCodes.set(email, { code, exp: Date.now() + 10 * 60_000 });
  console.log(`[verify-code] ${email}: ${code}`);
  return code;
}
function checkVerifyCode(email, code) {
  const rec = verifyCodes.get(email);
  if (!rec || rec.exp < Date.now()) return false;
  const ok = rec.code === String(code);
  if (ok) verifyCodes.delete(email);
  return ok;
}

// ---------- health ----------
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// ============================================================
//  AUTH
// ============================================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = getUser(email);
  if (!user || !user.password) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });
  res.json({ ok: true, token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || name.trim().length < 2) return res.status(400).json({ error: 'Tên cần tối thiểu 2 ký tự' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return res.status(400).json({ error: 'Email không hợp lệ' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự' });
  if (getUser(email)) return res.status(400).json({ error: 'Email đã được đăng ký' });
  const userCode = nextUserCode();
  createUser({
    email: String(email).toLowerCase(),
    name: name.trim(),
    password: bcrypt.hashSync(password, 10),
    userCode,
  });
  const user = getUser(email);
  res.json({ ok: true, token: sign(user), user: publicUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ ok: true, user: publicUser(getUser(req.user.email)) });
});

app.post('/api/auth/google', async (req, res) => {
  const { access_token: accessToken, credential } = req.body || {};
  const token = accessToken || credential;
  if (!token) return res.status(400).json({ error: 'Thiếu token Google' });
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error('google userinfo failed');
    const info = await resp.json();
    const email = String(info.email || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Tài khoản Google không có email' });
    let user = getUser(email);
    if (!user) {
      createUser({
        email,
        name: info.name || email.split('@')[0],
        password: null,
        googleOnly: 1,
        userCode: nextUserCode(),
        source: 'google',
      });
      user = getUser(email);
    }
    res.json({ ok: true, token: sign(user), user: publicUser(user) });
  } catch {
    return res.status(401).json({ error: 'Xác thực Google thất bại' });
  }
});

app.post('/api/auth/send-code', auth, (req, res) => {
  const code = genVerifyCode(req.user.email);
  res.json({ ok: true, devCode: code });
});

app.post('/api/auth/change-email', auth, (req, res) => {
  const { code, newEmail } = req.body || {};
  if (!checkVerifyCode(req.user.email, code)) return res.status(400).json({ error: 'Mã xác thực không đúng hoặc đã hết hạn' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail || '')) return res.status(400).json({ error: 'Email mới không hợp lệ' });
  if (getUser(newEmail)) return res.status(400).json({ error: 'Email đã được dùng bởi tài khoản khác' });
  renameUserEmail(req.user.email, String(newEmail).toLowerCase());
  const user = getUser(newEmail);
  res.json({ ok: true, token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/change-password', auth, (req, res) => {
  const { code, currentPassword, newPassword } = req.body || {};
  const user = getUser(req.user.email);
  if (user.googleOnly && !user.password) {
    // Google-only: cho đặt mật khẩu mới luôn
  } else if (!bcrypt.compareSync(currentPassword || '', user.password || '')) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  }
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới cần tối thiểu 6 ký tự' });
  if (!checkVerifyCode(req.user.email, code)) return res.status(400).json({ error: 'Mã xác thực không đúng hoặc đã hết hạn' });
  updateUser(user.email, { password: bcrypt.hashSync(newPassword, 10), googleOnly: 0 });
  res.json({ ok: true });
});

// ============================================================
//  PRODUCTS — slot live (nguồn sự thật)
// ============================================================
app.get('/api/products', auth, (req, res) => {
  const products = listProducts().map((p) => ({
    id: p.id, name: p.name, description: p.description, price: p.price,
    totalSlots: p.totalSlots, bookedSlots: p.bookedSlots, gradient: p.gradient, icon: p.icon,
  }));
  res.json({ ok: true, products });
});

// ============================================================
//  ORDERS
// ============================================================
app.post('/api/orders', auth, (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Giỏ hàng trống' });
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });

  const qtyByProduct = {};
  for (const item of items) {
    const pid = typeof item?.productId === 'string' ? item.productId : null;
    const qty = Number(item?.quantity);
    if (!pid || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Sản phẩm trong giỏ không hợp lệ' });
    qtyByProduct[pid] = (qtyByProduct[pid] || 0) + qty;
  }
  let computedTotal = 0;
  for (const [pid, qty] of Object.entries(qtyByProduct)) {
    const product = getProductById(pid);
    if (!product || !product.active) return res.status(400).json({ error: 'Sản phẩm không tồn tại hoặc đã ngừng bán' });
    const remaining = product.totalSlots - product.bookedSlots;
    if (qty > remaining) {
      return res.status(400).json({ error: `Vượt số slot còn lại, Chỉ còn ${remaining} slot cho ${product.name}` });
    }
    computedTotal += product.price * qty;
  }
  if (user.balance < computedTotal) return res.status(400).json({ error: 'Số dư không đủ' });

  updateUser(user.email, { balance: user.balance - computedTotal });
  const order = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    email: user.email,
    items,
    total: computedTotal,
    status: 'Đang xử lý',
    timestamp: Date.now(),
  };
  createOrder(order);
  for (const [pid, qty] of Object.entries(qtyByProduct)) bookSlots(pid, qty);
  createTransaction({ id: `TX-${Date.now()}`, email: user.email, type: 'order', amount: -computedTotal, timestamp: Date.now() });

  const updated = getUser(user.email);
  broadcast(`user:${user.email}`, 'order:created', { email: user.email, order, actor: user.email });
  broadcast(null, 'analytics:changed', { reason: 'order:created', email: user.email });
  broadcast(null, 'products:changed', { reason: 'order:created', email: user.email });
  broadcast(`user:${user.email}`, 'user:updated', { email: user.email, reason: 'order', actor: user.email, user: publicUser(updated) });
  res.json({ ok: true, order, balance: updated.balance });
});

app.get('/api/orders', auth, (req, res) => {
  const orders = getOrders(req.user.email).map((o) => ({
    ...o,
    items: JSON.parse(o.items || '[]'),
  }));
  res.json({ ok: true, orders });
});

// ============================================================
//  BALANCE / TOPUP
// ============================================================
app.post('/api/balance/topup', auth, (req, res) => {
  const { amount } = req.body || {};
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < 10_000 || amt > 50_000_000) {
    return res.status(400).json({ error: 'Số tiền nạp phải từ 10.000đ đến 50.000.000đ' });
  }
  const result = creditTopup(req.user.email, amt, 'topup', `TOPUP-${Date.now()}`);
  broadcast(`user:${req.user.email}`, 'user:updated', { email: req.user.email, reason: 'topup', actor: req.user.email, user: publicUser(getUser(req.user.email)) });
  broadcast(null, 'analytics:changed', { reason: 'topup', email: req.user.email });
  res.json({ ok: true, ...result });
});

// ============================================================
//  UPGRADES
// ============================================================
app.post('/api/upgrades/purchase', auth, (req, res) => {
  const { upgradeId, price } = req.body || {};
  if (!upgradeId || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ error: 'Gói nâng cấp không hợp lệ' });
  }
  const user = getUser(req.user.email);
  if (getPurchases(user.email).includes(upgradeId)) return res.status(400).json({ error: 'Đã sở hữu gói này' });
  const p = Math.round(Number(price));
  if (user.balance < p) return res.status(400).json({ error: 'Số dư không đủ' });
  updateUser(user.email, { balance: user.balance - p });
  addPurchase(user.email, upgradeId);
  createTransaction({ id: `TX-${Date.now()}`, email: user.email, type: 'purchase', amount: -p, timestamp: Date.now() });
  const updated = getUser(user.email);
  broadcast(`user:${user.email}`, 'user:updated', { email: user.email, reason: 'upgrade', actor: user.email, user: publicUser(updated) });
  res.json({ ok: true, balance: updated.balance });
});

// ============================================================
//  PAYMENTS (VietQR động — NAP content + webhook)
// ============================================================
const PAYMENT_TTL = 15 * 60_000;

app.post('/api/payments/create', auth, (req, res) => {
  const { amount } = req.body || {};
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < 10_000 || amt > 50_000_000) {
    return res.status(400).json({ error: 'Số tiền phải từ 10.000đ đến 50.000.000đ' });
  }
  expireStalePayments();
  const payment = {
    id: `PR-${Date.now().toString(36).toUpperCase()}`,
    email: req.user.email,
    content: genPaymentContent(),
    amount: amt,
    createdAt: Date.now(),
    expiresAt: Date.now() + PAYMENT_TTL,
  };
  createPaymentRequest(payment);
  res.json({ ok: true, payment: publicPayment(getPaymentRequest(payment.id)) });
});

app.get('/api/payments/:id', auth, (req, res) => {
  const p = getPaymentRequest(req.params.id);
  if (!p || p.email !== req.user.email) return res.status(404).json({ error: 'Không tìm thấy yêu cầu thanh toán' });
  if (p.status === 'pending' && p.expiresAt < Date.now()) {
    expireStalePayments();
    return res.json({ ok: true, payment: publicPayment(getPaymentRequest(p.id)) });
  }
  res.json({ ok: true, payment: publicPayment(p) });
});

/** Mô phỏng cổng thanh toán gọi webhook — dùng để test flow end-to-end */
app.post('/api/payments/:id/simulate', auth, (req, res) => {
  const p = getPaymentRequest(req.params.id);
  if (!p || p.email !== req.user.email) return res.status(404).json({ error: 'Không tìm thấy yêu cầu thanh toán' });
  if (p.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã xử lý' });
  const ref = `SIM-${crypto.randomBytes(6).toString('hex')}`;
  const result = creditTopup(p.email, p.amount, 'topup', ref);
  markPaymentPaid(p.id, { ...result, simulated: true }, ref);
  addWebhookLog({ ts: Date.now(), ip: reqIp(req), provider: 'simulate', ok: 1, reason: 'simulate-paid', content: p.content, amount: p.amount });
  broadcast(`user:${p.email}`, 'user:updated', { email: p.email, reason: 'topup', actor: p.email, user: publicUser(getUser(p.email)) });
  broadcast(null, 'analytics:changed', { reason: 'topup', email: p.email });
  res.json({ ok: true, payment: publicPayment(getPaymentRequest(p.id)) });
});

/** Webhook cổng thanh toán (casso/sepay/custom) — POST /api/payments/webhook?api_key={secret} */
app.post('/api/payments/webhook', (req, res) => {
  const apikey = String(req.query.api_key || '');
  const secret = getSetting('webhook_secret');
  const ip = reqIp(req);
  const body = req.body || {};
  const rawContent = String(body.content || body.description || body.message || '');
  const amount = Number(body.amount) || 0;
  const providerRef = String(body.id || body.referenceCode || body.transactionId || '') || null;
  const provider = /casso/i.test(req.headers['user-agent'] || '') ? 'casso' : /sepay/i.test(req.headers['user-agent'] || '') ? 'sepay' : 'custom';

  if (!secret || apikey !== secret) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'invalid api_key', content: rawContent, amount });
    return res.status(401).json({ ok: false, error: 'invalid api_key' });
  }

  // Tìm NAP content (NAPxxxxxx) trong mô tả giao dịch
  const m = rawContent.toUpperCase().match(/NAP(\d{6})/);
  if (!m) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'no NAP content', content: rawContent, amount });
    return res.json({ ok: false, error: 'no NAP content' });
  }
  const napCode = m[0];

  // Ưu tiên 1: khớp payment request pending theo content
  let payment = findPendingPaymentByContent(napCode);
  // Ưu tiên 2: NAP{userCode} của user (nạp không cần tạo PR)
  let targetUser = payment ? getUser(payment.email) : null;
  if (!targetUser) {
    const userCode = Number(m[1]);
    targetUser = getUserByUserCode(userCode);
  }
  if (!targetUser) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'NAP code không khớp', content: napCode, amount });
    return res.json({ ok: false, error: 'nap-not-found' });
  }
  if (payment && amount > 0 && amount !== payment.amount) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'amount mismatch', content: napCode, amount });
    return res.json({ ok: false, error: 'amount-mismatch' });
  }
  const creditAmount = amount > 0 ? amount : (payment ? payment.amount : 0);
  if (creditAmount <= 0) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'amount missing', content: napCode, amount });
    return res.json({ ok: false, error: 'amount-missing' });
  }

  const result = creditTopup(targetUser.email, creditAmount, 'topup', providerRef || `${napCode}-${Date.now()}`);
  if (payment) markPaymentPaid(payment.id, result, providerRef || napCode);
  addWebhookLog({ ts: Date.now(), ip, provider, ok: 1, reason: `credited ${creditAmount}`, content: napCode, amount: creditAmount });

  broadcast(`user:${targetUser.email}`, 'user:updated', { email: targetUser.email, reason: 'topup', actor: 'webhook', user: publicUser(getUser(targetUser.email)) });
  broadcast(null, 'analytics:changed', { reason: 'topup', email: targetUser.email });
  res.json({ ok: true, email: targetUser.email, balance: result.balance, bonus: result.bonus, vipBonus: result.vipBonus });
});

// ============================================================
//  ADMIN
// ============================================================
app.get('/api/admin/users', auth, requireAdmin, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
  const q = String(req.query.q || '').toLowerCase().trim();
  const role = String(req.query.role || '');
  const sort = String(req.query.sort || 'newest');

  let users = getUsers();
  if (q) users = users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || String(u.userCode || '').includes(q));
  if (role === 'admin' || role === 'member') users = users.filter((u) => u.role === role);
  users.sort((a, b) => {
    switch (sort) {
      case 'oldest': return a.createdAt - b.createdAt;
      case 'balance': return b.balance - a.balance;
      case 'topup': return getTotalTopup(b.email) - getTotalTopup(a.email);
      default: return b.createdAt - a.createdAt;
    }
  });
  const total = users.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const slice = users.slice((page - 1) * pageSize, page * pageSize);
  res.json({
    ok: true,
    users: slice.map((u) => ({ ...publicUser(u), createdAt: u.createdAt, googleOnly: !!u.googleOnly })),
    total, pageCount, page: Math.min(page, pageCount),
  });
});

app.put('/api/admin/users/:email', auth, requireAdmin, (req, res) => {
  const email = String(req.params.email).toLowerCase();
  const target = getUser(email);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  const { name, role, avatar, vipOverride, balance, balanceDelta, balanceAction, amount } = req.body || {};
  const fields = {};
  if (typeof name === 'string' && name.trim().length >= 2) fields.name = name.trim();
  if (role === 'admin' || role === 'member') fields.role = role;
  if (typeof avatar === 'string' || avatar === null) fields.avatar = avatar;
  if (vipOverride === null || [0, 1, 2, 3, 4].includes(Number(vipOverride))) {
    fields.vipOverride = vipOverride === null ? null : Number(vipOverride);
  }
  if (Number.isInteger(Number(balance)) && Number(balance) >= 0) {
    fields.balance = Number(balance);
    createTransaction({ id: `TX-${Date.now()}`, email, type: 'admin_set', amount: Number(balance), timestamp: Date.now() });
  } else if (balanceAction === 'add' || balanceAction === 'sub') {
    const amt = Math.round(Number(amount) || 0);
    if (amt > 0) {
      const next = balanceAction === 'add' ? target.balance + amt : Math.max(0, target.balance - amt);
      fields.balance = next;
      createTransaction({ id: `TX-${Date.now()}`, email, type: 'admin_topup', amount: balanceAction === 'add' ? amt : -amt, timestamp: Date.now() });
    }
  }
  updateUser(email, fields);
  broadcastUserUpdated(email, req.user.email);
  broadcast(null, 'users:changed', { type: 'updated', email, actor: req.user.email });
  broadcast(null, 'analytics:changed', { reason: 'admin-edit', email: req.user.email });
  res.json({ ok: true, user: publicUser(getUser(email)) });
});

app.delete('/api/admin/users/:email', auth, requireAdmin, (req, res) => {
  const email = String(req.params.email).toLowerCase();
  if (email === req.user.email) return res.status(400).json({ error: 'Không thể xóa chính mình' });
  const target = getUser(email);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  deleteUser(email);
  broadcast(`user:${email}`, 'user:deleted', { email, reason: 'deleted', actor: req.user.email });
  broadcast(null, 'users:changed', { type: 'deleted', email, actor: req.user.email });
  broadcast(null, 'analytics:changed', { reason: 'user-deleted', email: req.user.email });
  res.json({ ok: true });
});

app.post('/api/admin/users/bulk', auth, requireAdmin, (req, res) => {
  const { action, emails, role } = req.body || {};
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'Danh sách email trống' });
  const list = emails.map((e) => String(e).toLowerCase()).filter((e) => e && e !== req.user.email);
  if (action === 'delete') {
    list.forEach((e) => {
      if (getUser(e)) {
        deleteUser(e);
        broadcast(`user:${e}`, 'user:deleted', { email: e, reason: 'deleted', actor: req.user.email });
      }
    });
    broadcast(null, 'users:changed', { type: 'bulk-delete', count: list.length, actor: req.user.email });
    broadcast(null, 'analytics:changed', { reason: 'bulk-delete', email: req.user.email });
    return res.json({ ok: true, deleted: list.length });
  }
  if (action === 'role' && (role === 'admin' || role === 'member')) {
    list.forEach((e) => {
      if (getUser(e)) {
        updateUser(e, { role });
        broadcastUserUpdated(e, req.user.email);
      }
    });
    broadcast(null, 'users:changed', { type: 'bulk-role', count: list.length, role, actor: req.user.email });
    return res.json({ ok: true, updated: list.length });
  }
  return res.status(400).json({ error: 'Hành động không hợp lệ' });
});

app.get('/api/admin/orders', auth, requireAdmin, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
  const status = String(req.query.status || '');
  const q = String(req.query.q || '').toLowerCase().trim();
  let orders = dbAllOrders();
  if (status) orders = orders.filter((o) => o.status === status);
  if (q) orders = orders.filter((o) => o.id.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q));
  orders.sort((a, b) => b.timestamp - a.timestamp);
  const total = orders.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const slice = orders.slice((page - 1) * pageSize, page * pageSize);
  res.json({ ok: true, orders: slice, total, pageCount, page: Math.min(page, pageCount) });
});

function dbAllOrders() {
  const users = getUsers();
  const nameMap = new Map(users.map((u) => [u.email, u.name]));
  return db.prepare('SELECT * FROM orders').all().map((o) => ({
    id: o.id,
    email: o.email,
    customer: nameMap.get(o.email) || o.email,
    items: JSON.parse(o.items || '[]'),
    total: o.total,
    status: o.status,
    timestamp: o.timestamp,
    date: o.timestamp,
  }));
}

app.put('/api/admin/orders/:id', auth, requireAdmin, (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  const { status } = req.body || {};
  if (!['Hoàn thành', 'Đang xử lý', 'Đã hủy'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }
  updateOrderStatus(order.id, status);
  broadcast(`user:${order.email}`, 'order:updated', { email: order.email, orderId: order.id, status });
  broadcast(null, 'analytics:changed', { reason: 'order-status', email: req.user.email });
  res.json({ ok: true, order: getOrder(order.id) });
});

// ----- Admin payments -----
app.get('/api/admin/payments/config', auth, requireAdmin, (req, res) => {
  const secret = getSetting('webhook_secret');
  res.json({
    ok: true,
    hasSecret: !!secret,
    secret,
    bank: { bin: BANK.bin, accountNumber: BANK.accountNumber, accountName: BANK.accountName },
    momo: { number: '0368852235', name: 'NGUYỄN THẾ LƯƠNG' },
    webhookPath: '/api/payments/webhook',
    createdAt: Number(getSetting('webhook_secret_created')) || null,
  });
});

app.post('/api/admin/payments/config/secret', auth, requireAdmin, (req, res) => {
  const custom = String(req.body?.secret || '').trim();
  const secret = custom.length >= 8 ? custom : crypto.randomBytes(16).toString('hex');
  setSetting('webhook_secret', secret);
  setSetting('webhook_secret_created', String(Date.now()));
  res.json({ ok: true, secret });
});

app.get('/api/admin/payments', auth, requireAdmin, (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
  const payments = listPayments(limit).map((p) => ({ ...p, result: p.result ? JSON.parse(p.result) : null }));
  res.json({ ok: true, payments });
});

app.get('/api/admin/payments/logs', auth, requireAdmin, (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  res.json({ ok: true, logs: getWebhookLogs(limit) });
});

// ============================================================
//  ANALYTICS
// ============================================================
app.get('/api/analytics', auth, (req, res) => {
  try {
    res.json(getAnalytics());
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Không thể tính toán dữ liệu phân tích' });
  }
});

app.get('/api/analytics/daily', auth, (req, res) => {
  try {
    res.json(getDailyRevenue(req.query.month));
  } catch (err) {
    console.error('Analytics daily error:', err);
    res.status(500).json({ error: 'Không thể tính doanh thu theo ngày' });
  }
});

// ============================================================
//  CHAT AI (z-ai-web-dev-sdk — backend only)
// ============================================================
let zaiPromise = null;
async function getZai() {
  if (!zaiPromise) {
    zaiPromise = import('z-ai-web-dev-sdk').then((m) => m.default.create());
  }
  return zaiPromise;
}

app.get('/api/chat', auth, (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  if (!sessionId) return res.status(400).json({ error: 'Thiếu sessionId' });
  const messages = getChatMessages(req.user.email, sessionId).map((m) => ({
    role: m.role, content: m.content, createdAt: m.createdAt,
  }));
  res.json({ ok: true, messages });
});

app.post('/api/chat', auth, async (req, res) => {
  const { sessionId, message } = req.body || {};
  const sid = String(sessionId || '');
  const text = String(message || '').trim();
  if (!sid || !text) return res.status(400).json({ error: 'Thiếu sessionId hoặc nội dung' });
  if (text.length > 2000) return res.status(400).json({ error: 'Tin nhắn quá dài (tối đa 2000 ký tự)' });

  addChatMessage(req.user.email, sid, 'user', text);
  try {
    const zai = await getZai();
    const history = getChatMessages(req.user.email, sid).slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Bạn là trợ lý CSKH của shop acc Netflix Trial (Netflix Trial 30 days — 20.000đ/slot, 100 slot). ' +
            'Trả lời ngắn gọn, thân thiện, tiếng Việt. Hướng dẫn: nạp tiền qua trang "Nạp số dư" (QR tự động), ' +
            'mua ở trang "Sản phẩm", đơn mới luôn "Đang xử lý" cho tới khi shop gửi thông tin. ' +
            'Khi được hỏi gì ngoài phạm vi shop, trả lời lịch sự và đưa về chủ đề mua hàng/nạp tiền.',
        },
        ...history,
      ],
    });
    const reply = completion?.choices?.[0]?.message?.content || 'Xin lỗi, mình chưa trả lời được. Bạn thử lại nhé!';
    addChatMessage(req.user.email, sid, 'assistant', reply);
    res.json({ ok: true, response: reply });
  } catch (err) {
    console.error('[chat] LLM error:', err.message);
    res.status(500).json({ error: 'Trợ lý AI đang bận, thử lại sau ít phút' });
  }
});

app.delete('/api/chat/:sessionId', auth, (req, res) => {
  clearChatMessages(req.user.email, String(req.params.sessionId));
  res.json({ ok: true });
});

// ============================================================
//  START
// ============================================================
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  connectRealtimeBridge();
});
