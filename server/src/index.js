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
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
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
  nextUserCode, q, qGet, debitBalance, adjustBalance, db,
} from './db.js';
import { getAnalytics, getDailyRevenue } from './analytics.js';
import { genPaymentContent, publicPayment, BANK } from './payments.js';
import { connectRealtimeBridge, broadcast, setRealtimeLocal } from './realtime.js';
import { creditTopup, publicUser, getVipTier, parseAmountVND } from './helpers.js';
import { chatComplete, aiMode } from './ai.js';

// Task 79: mọi route giờ là async (libSQL) — wrap bắt lỗi async trả 500 gọn (Express 4 không tự bắt)
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('[api]', req.method, req.originalUrl, '→', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Lỗi hệ thống, vui lòng thử lại' });
  });

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_7D = '7d';
const DEPLOY = process.env.DEPLOY === '1'; // 1 process tự chủ: static + API + socket.io cùng port

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- helpers ----------
const reqIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
function sign(user) {
  return jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_7D });
}
async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUser(payload.email);
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
const broadcastUserUpdated = async (email, actor) => {
  const u = await getUser(email);
  if (u) broadcast(`user:${email}`, 'user:updated', { email, reason: 'admin-edit', actor: actor || email, user: await publicUser(u) });
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
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await getUser(email);
  if (!user || !user.password) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });
  res.json({ ok: true, token: sign(user), user: await publicUser(user) });
}));

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || name.trim().length < 2) return res.status(400).json({ error: 'Tên cần tối thiểu 2 ký tự' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return res.status(400).json({ error: 'Email không hợp lệ' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự' });
  if (await getUser(email)) return res.status(400).json({ error: 'Email đã được đăng ký' });
  const userCode = await nextUserCode();
  await createUser({
    email: String(email).toLowerCase(),
    name: name.trim(),
    password: bcrypt.hashSync(password, 10),
    userCode,
  });
  const user = await getUser(email);
  res.json({ ok: true, token: sign(user), user: await publicUser(user) });
}));

app.get('/api/auth/me', auth, wrap(async (req, res) => {
  res.json({ ok: true, user: await publicUser(await getUser(req.user.email)) });
}));

app.post('/api/auth/google', wrap(async (req, res) => {
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
    let user = await getUser(email);
    if (!user) {
      await createUser({
        email,
        name: info.name || email.split('@')[0],
        password: null,
        googleOnly: 1,
        userCode: await nextUserCode(),
        source: 'google',
      });
      user = await getUser(email);
    }
    res.json({ ok: true, token: sign(user), user: await publicUser(user) });
  } catch {
    return res.status(401).json({ error: 'Xác thực Google thất bại' });
  }
}));

app.post('/api/auth/send-code', auth, (req, res) => {
  const code = genVerifyCode(req.user.email);
  // bundle cũ đọc e.demo + e.devCode (modal đổi email/mk) và e.code (Profile) — trả đủ 3 field
  res.json({ ok: true, demo: true, devCode: code, code });
});

app.post('/api/auth/change-email', auth, wrap(async (req, res) => {
  const { code, newEmail } = req.body || {};
  if (!checkVerifyCode(req.user.email, code)) return res.status(400).json({ error: 'Mã xác thực không đúng hoặc đã hết hạn' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail || '')) return res.status(400).json({ error: 'Email mới không hợp lệ' });
  if (await getUser(newEmail)) return res.status(400).json({ error: 'Email đã được dùng bởi tài khoản khác' });
  await renameUserEmail(req.user.email, String(newEmail).toLowerCase());
  const user = await getUser(newEmail);
  res.json({ ok: true, token: sign(user), user: await publicUser(user) });
}));

app.post('/api/auth/change-password', auth, wrap(async (req, res) => {
  const { code, currentPassword, newPassword } = req.body || {};
  const user = await getUser(req.user.email);
  if (user.googleOnly && !user.password) {
    // Google-only: cho đặt mật khẩu mới luôn
  } else if (!bcrypt.compareSync(currentPassword || '', user.password || '')) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  }
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới cần tối thiểu 6 ký tự' });
  if (!checkVerifyCode(req.user.email, code)) return res.status(400).json({ error: 'Mã xác thực không đúng hoặc đã hết hạn' });
  await updateUser(user.email, { password: bcrypt.hashSync(newPassword, 10), googleOnly: 0 });
  res.json({ ok: true });
}));

// ============================================================
//  PRODUCTS — slot live (nguồn sự thật)
// ============================================================
app.get('/api/products', auth, wrap(async (req, res) => {
  const products = (await listProducts()).map((p) => ({
    id: p.id, name: p.name, description: p.description, price: p.price,
    totalSlots: p.totalSlots, bookedSlots: p.bookedSlots, gradient: p.gradient, icon: p.icon,
  }));
  res.json({ ok: true, products });
}));

// ============================================================
//  ORDERS
// ============================================================
app.post('/api/orders', auth, wrap(async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Giỏ hàng trống' });
  const user = await getUser(req.user.email);
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
    const product = await getProductById(pid);
    if (!product || !product.active) return res.status(400).json({ error: 'Sản phẩm không tồn tại hoặc đã ngừng bán' });
    const remaining = product.totalSlots - product.bookedSlots;
    if (qty > remaining) {
      return res.status(400).json({ error: `Vượt số slot còn lại, Chỉ còn ${remaining} slot cho ${product.name}` });
    }
    computedTotal += product.price * qty;
  }
  // Task 79: trừ tiền NGUYÊN TỬ — 1 lệnh SQL kiểm tra đủ tiền + trừ, chống race khi 2 request xen kẽ
  const newBalance = await debitBalance(user.email, computedTotal);
  if (newBalance == null) return res.status(400).json({ error: 'Số dư không đủ' });

  const order = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    email: user.email,
    items,
    total: computedTotal,
    status: 'Đang xử lý',
    timestamp: Date.now(),
  };
  await createOrder(order);
  for (const [pid, qty] of Object.entries(qtyByProduct)) await bookSlots(pid, qty);
  await createTransaction({ id: `TX-${Date.now()}`, email: user.email, type: 'order', amount: -computedTotal, timestamp: Date.now() });

  broadcast(`user:${user.email}`, 'order:created', { email: user.email, order, actor: user.email });
  broadcast(null, 'analytics:changed', { reason: 'order:created', email: user.email });
  broadcast(null, 'products:changed', { reason: 'order:created', email: user.email });
  broadcast(`user:${user.email}`, 'user:updated', { email: user.email, reason: 'order', actor: user.email, user: await publicUser({ ...user, balance: newBalance }) });
  res.json({ ok: true, order, balance: newBalance });
}));

app.get('/api/orders', auth, wrap(async (req, res) => {
  const orders = (await getOrders(req.user.email)).map((o) => ({
    ...o,
    items: JSON.parse(o.items || '[]'),
  }));
  res.json({ ok: true, orders });
}));

// ============================================================
//  BALANCE / TOPUP
// ============================================================
app.post('/api/balance/topup', auth, wrap(async (req, res) => {
  const { amount } = req.body || {};
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < 10_000 || amt > 50_000_000) {
    return res.status(400).json({ error: 'Số tiền nạp phải từ 10.000đ đến 50.000.000đ' });
  }
  const result = await creditTopup(req.user.email, amt, 'topup', `TOPUP-${Date.now()}`);
  broadcast(`user:${req.user.email}`, 'user:updated', { email: req.user.email, reason: 'topup', actor: req.user.email, user: await publicUser(await getUser(req.user.email)) });
  broadcast(null, 'analytics:changed', { reason: 'topup', email: req.user.email });
  res.json({ ok: true, ...result });
}));

// ============================================================
//  UPGRADES
// ============================================================
app.post('/api/upgrades/purchase', auth, wrap(async (req, res) => {
  const { upgradeId, price } = req.body || {};
  if (!upgradeId || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ error: 'Gói nâng cấp không hợp lệ' });
  }
  const user = await getUser(req.user.email);
  if ((await getPurchases(user.email)).includes(upgradeId)) return res.status(400).json({ error: 'Đã sở hữu gói này' });
  const p = Math.round(Number(price));
  // Task 79: trừ tiền NGUYÊN TỬ (đủ tiền mới trừ)
  const newBalance = await debitBalance(user.email, p);
  if (newBalance == null) return res.status(400).json({ error: 'Số dư không đủ' });
  await addPurchase(user.email, upgradeId);
  await createTransaction({ id: `TX-${Date.now()}`, email: user.email, type: 'purchase', amount: -p, timestamp: Date.now() });
  broadcast(`user:${user.email}`, 'user:updated', { email: user.email, reason: 'upgrade', actor: user.email, user: await publicUser({ ...user, balance: newBalance }) });
  // bundle cũ setState từ response: {balance, purchasedUpgrades}
  res.json({ ok: true, balance: newBalance, purchasedUpgrades: await getPurchases(user.email) });
}));

// ============================================================
//  PROFILE (bundle cũ gọi PUT /profile + POST /profile/migrate)
// ============================================================
app.put('/api/profile', auth, wrap(async (req, res) => {
  const { name, avatar } = req.body || {};
  const fields = {};
  if (typeof name === 'string' && name.trim().length >= 2) fields.name = name.trim();
  if (typeof avatar === 'string' || avatar === null) fields.avatar = avatar;
  if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Không có thay đổi hợp lệ' });
  await updateUser(req.user.email, fields);
  await broadcastUserUpdated(req.user.email, req.user.email);
  broadcast(null, 'users:changed', { type: 'profile', email: req.user.email, actor: req.user.email });
  res.json({ ok: true, user: await publicUser(await getUser(req.user.email)) });
}));

app.post('/api/profile/migrate', auth, wrap(async (req, res) => {
  // migration từ localStorage cũ — server là nguồn sự thật, chỉ nhận name/avatar hợp lệ
  const { name, avatar } = req.body || {};
  const fields = {};
  if (typeof name === 'string' && name.trim().length >= 2 && !name.toLowerCase().includes('tài khoản')) fields.name = name.trim();
  if (typeof avatar === 'string' && avatar.startsWith('gradient:')) fields.avatar = avatar;
  if (Object.keys(fields).length > 0) {
    await updateUser(req.user.email, fields);
    await broadcastUserUpdated(req.user.email, req.user.email);
  }
  res.json({ ok: true, user: await publicUser(await getUser(req.user.email)) });
}));

// ============================================================
//  PAYMENTS (VietQR động — NAP content + webhook)
// ============================================================
const PAYMENT_TTL = 15 * 60_000;

app.post('/api/payments/create', auth, wrap(async (req, res) => {
  const { amount } = req.body || {};
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < 10_000 || amt > 50_000_000) {
    return res.status(400).json({ error: 'Số tiền phải từ 10.000đ đến 50.000.000đ' });
  }
  await expireStalePayments();
  // Nội dung CK = NAP_ID cố định theo user (userCode duy nhất) — quét QR tự điền, webhook khớp user
  const me = await getUser(req.user.email);
  const payment = {
    id: `PR-${Date.now().toString(36).toUpperCase()}`,
    email: req.user.email,
    content: me?.userCode ? `NAP${me.userCode}` : genPaymentContent(),
    amount: amt,
    createdAt: Date.now(),
    expiresAt: Date.now() + PAYMENT_TTL,
  };
  await createPaymentRequest(payment);
  res.json({ ok: true, payment: publicPayment(await getPaymentRequest(payment.id)) });
}));

app.get('/api/payments/:id', auth, wrap(async (req, res) => {
  const p = await getPaymentRequest(req.params.id);
  if (!p || p.email !== req.user.email) return res.status(404).json({ error: 'Không tìm thấy yêu cầu thanh toán' });
  if (p.status === 'pending' && p.expiresAt < Date.now()) {
    await expireStalePayments();
    return res.json({ ok: true, payment: publicPayment(await getPaymentRequest(p.id)) });
  }
  res.json({ ok: true, payment: publicPayment(p) });
}));

/** Mô phỏng cổng thanh toán gọi webhook — dùng để test flow end-to-end */
app.post('/api/payments/:id/simulate', auth, wrap(async (req, res) => {
  const p = await getPaymentRequest(req.params.id);
  if (!p || p.email !== req.user.email) return res.status(404).json({ error: 'Không tìm thấy yêu cầu thanh toán' });
  if (p.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã xử lý' });
  const ref = `SIM-${crypto.randomBytes(6).toString('hex')}`;
  const result = await creditTopup(p.email, p.amount, 'topup', ref);
  await markPaymentPaid(p.id, { ...result, simulated: true }, ref);
  await addWebhookLog({ ts: Date.now(), ip: reqIp(req), provider: 'simulate', ok: 1, reason: 'simulate-paid', content: p.content, amount: p.amount });
  broadcast(`user:${p.email}`, 'user:updated', { email: p.email, reason: 'topup', actor: p.email, user: await publicUser(await getUser(p.email)), topup: { amount: p.amount, bonus: (result.bonus || 0) + (result.vipBonus || 0), balance: result.balance } });
  broadcast(null, 'analytics:changed', { reason: 'topup', email: p.email });
  res.json({ ok: true, payment: publicPayment(await getPaymentRequest(p.id)) });
}));

// Task 77: replay guard — webhook KHÔNG có id gửi lại y hệt (cùng NAP + số tiền) trong 90s → chặn, không cộng 2 lần
const REPLAY_WINDOW_MS = 90_000;
const replayGuard = new Map(); // key: napCode|amount → ts
function hitReplayGuard(napCode, amount) {
  const now = Date.now();
  for (const [k, ts] of replayGuard) if (now - ts > REPLAY_WINDOW_MS) replayGuard.delete(k); // dọn cũ
  const key = `${napCode}|${amount}`;
  if (replayGuard.has(key)) return true;
  replayGuard.set(key, now);
  return false;
}

/** Webhook cổng thanh toán (casso/sepay/custom) — POST /api/payments/webhook?api_key={secret} */
app.post('/api/payments/webhook', wrap(async (req, res) => {
  const apikey = String(req.query.api_key || '');
  const secret = await getSetting('webhook_secret');
  const ip = reqIp(req);
  const body = req.body || {};
  const rawContent = String(body.content || body.description || body.message || '');
  const amount = parseAmountVND(body.amount); // Task 77: chịu "25.000" / "1,000,000" / 25000.9 / 25000
  const providerRef = String(body.id || body.referenceCode || body.transactionId || '') || null;
  const provider = /casso/i.test(req.headers['user-agent'] || '') ? 'casso' : /sepay/i.test(req.headers['user-agent'] || '') ? 'sepay' : 'custom';

  if (!secret || apikey !== secret) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'invalid api_key', content: rawContent, amount });
    return res.status(401).json({ ok: false, error: 'invalid api_key' });
  }

  // Tìm NAP content (NAPxxxxxx — chấp nhận khoảng trắng giữa NAP và mã)
  const m = rawContent.toUpperCase().match(/NAP\s*(\d{6})/);
  if (!m) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'no NAP content', content: rawContent, amount });
    return res.json({ ok: false, error: 'no NAP content' });
  }
  const napCode = m[0];

  // Ưu tiên 1: NAP{userCode} — mã định danh duy nhất của user (nạp không cần PR)
  let targetUser = await getUserByUserCode(Number(m[1]));
  // Ưu tiên 2: khớp payment request pending theo content (content ngẫu nhiên cũ)
  let payment = targetUser ? null : await findPendingPaymentByContent(napCode);
  if (!targetUser && payment) targetUser = await getUser(payment.email);
  if (!targetUser) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'NAP code không khớp', content: napCode, amount });
    return res.json({ ok: false, error: 'nap-not-found' });
  }
  if (payment && amount > 0 && amount !== payment.amount) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'amount mismatch', content: napCode, amount });
    return res.json({ ok: false, error: 'amount-mismatch' });
  }
  // Bookkeeping: hoàn tất PR pending cùng NAP_ID + đúng số tiền của user này (nếu có)
  if (!payment && targetUser && amount > 0) {
    const pr = await findPendingPaymentByContent(napCode);
    if (pr && pr.email === targetUser.email && pr.amount === amount) payment = pr;
  }
  const creditAmount = amount > 0 ? amount : (payment ? payment.amount : 0);
  if (creditAmount <= 0) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'amount missing', content: napCode, amount });
    return res.json({ ok: false, error: 'amount-missing' });
  }
  // Idempotent: giao dịch đã xử lý (cùng providerRef) → bỏ qua, không cộng 2 lần
  if (providerRef && await qGet('SELECT 1 AS x FROM transactions WHERE id = ?', [`TX-${providerRef}`])) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'duplicate transaction', content: napCode, amount });
    return res.json({ ok: false, error: 'duplicate-transaction' });
  }
  // Task 77: không có providerRef → chặn replay cùng (NAP + amount) trong 90s
  if (!providerRef && hitReplayGuard(napCode, amount)) {
    addWebhookLog({ ts: Date.now(), ip, provider, ok: 0, reason: 'replay guard (90s, no id)', content: napCode, amount });
    return res.json({ ok: false, error: 'duplicate-transaction', hint: 'include unique id field to credit repeat transfers' });
  }

  const result = await creditTopup(targetUser.email, creditAmount, 'topup', providerRef || `${napCode}-${Date.now()}`);
  if (payment) await markPaymentPaid(payment.id, result, providerRef || napCode);
  await addWebhookLog({ ts: Date.now(), ip, provider, ok: 1, reason: `credited ${creditAmount}`, content: napCode, amount: creditAmount });

  // Payload kèm dữ liệu nạp — FE dùng để hiện modal "Nạp tiền thành công" giữa màn hình
  broadcast(`user:${targetUser.email}`, 'user:updated', { email: targetUser.email, reason: 'topup', actor: 'webhook', user: await publicUser(await getUser(targetUser.email)), topup: { amount: creditAmount, bonus: (result.bonus || 0) + (result.vipBonus || 0), balance: result.balance } });
  broadcast(null, 'analytics:changed', { reason: 'topup', email: targetUser.email });
  res.json({ ok: true, email: targetUser.email, balance: result.balance, bonus: result.bonus, vipBonus: result.vipBonus });
}));

// ============================================================
//  NOTIFICATIONS (topup)
// ============================================================
// Gần đây nhất: giao dịch nạp tiền của user (webhook/simulate/admin cộng) → mục thông báo ở chuông
// Task 75: trả đúng read flag + loại bỏ đã xóa (lưu trong notification_state)
app.get('/api/notifications/topups', auth, wrap(async (req, res) => {
  const txs = await q(
    `SELECT id, amount, type, timestamp FROM transactions
     WHERE email = ? AND (type = 'topup' OR (type = 'admin_topup' AND amount > 0))
     ORDER BY timestamp DESC LIMIT 10`,
    [req.user.email],
  );
  const u = await getUser(req.user.email);
  const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
  const stRows = await q(`SELECT nid, flag FROM notification_state WHERE email = ?`, [req.user.email]);
  const readSet = new Set(stRows.filter((r) => r.flag === 'read').map((r) => r.nid));
  const delSet = new Set(stRows.filter((r) => r.flag === 'deleted').map((r) => r.nid));
  res.json({
    ok: true,
    items: txs
      .filter((tx) => !delSet.has(`topup-${tx.id}`))
      .map((tx) => ({
        id: `topup-${tx.id}`,
        type: 'success',
        titleKey: 'notif.topup.title',
        messageKey: 'notif.topup.message',
        params: {
          amount: fmt(Math.abs(tx.amount)),
          balance: fmt(u ? u.balance : 0),
          source: tx.type === 'admin_topup'
            ? 'Quản trị viên đã cộng tiền vào tài khoản'
            : 'Hệ thống đã xác nhận giao dịch chuyển khoản',
          sourceEn: tx.type === 'admin_topup'
            ? 'An administrator has credited your account'
            : 'The system has confirmed your bank transfer',
        },
        timestamp: tx.timestamp,
        read: readSet.has(`topup-${tx.id}`),
        linkTo: 'topup',
      })),
  });
}));

// ============================================================
//  NOTIFICATION STATE (Task 75 — persist đã đọc / đã xóa theo user)
// ============================================================
app.get('/api/notifications/state', auth, wrap(async (req, res) => {
  const rows = await q(`SELECT nid, flag FROM notification_state WHERE email = ?`, [req.user.email]);
  res.json({
    ok: true,
    read: rows.filter((r) => r.flag === 'read').map((r) => r.nid),
    deleted: rows.filter((r) => r.flag === 'deleted').map((r) => r.nid),
  });
}));

// ids: mảng notification id (vd 'notif-revenue-record', 'topup-TX-...')
// Quy tắc: 'deleted' là trạng thái mạnh — không bao giờ bị hạ cấp về 'read' (chống hồi sinh thông báo đã xóa)
const markNotifState = (flag) => wrap(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(String).filter((x) => x && x.length < 200))].slice(0, 200) : [];
  if (!ids.length) return res.status(400).json({ error: 'Thiếu danh sách id thông báo' });
  const upsert = { sql: `INSERT INTO notification_state (email, nid, flag, ts) VALUES (?, ?, ?, ?)
    ON CONFLICT (email, nid) DO UPDATE SET flag = excluded.flag, ts = excluded.ts
    WHERE notification_state.flag <> 'deleted' OR excluded.flag = 'deleted'` };
  await db.batch(ids.map((nid) => ({ ...upsert, args: [req.user.email, nid, flag, Date.now()] })), 'write');
  res.json({ ok: true, count: ids.length });
});
app.post('/api/notifications/read', auth, markNotifState('read'));
app.post('/api/notifications/delete', auth, markNotifState('deleted'));
app.post('/api/notifications/clear', auth, markNotifState('deleted'));

// ============================================================
//  TOPUP HISTORY (Task 74 — lịch sử nạp tiền trên trang Nạp số dư)
// ============================================================
// Số liệu thô (amount/bonus raw, không format) — FE tự format theo locale vi/en
app.get('/api/topups/history', auth, wrap(async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  const txs = await q(
    `SELECT id, amount, bonus, type, timestamp FROM transactions
     WHERE email = ? AND (type = 'topup' OR (type = 'admin_topup' AND amount > 0))
     ORDER BY timestamp DESC LIMIT ?`,
    [req.user.email, limit],
  );
  res.json({
    ok: true,
    count: txs.length,
    items: txs.map((tx) => ({
      id: tx.id,
      amount: Math.abs(tx.amount),
      bonus: tx.bonus || 0,
      admin: tx.type === 'admin_topup',
      timestamp: tx.timestamp,
    })),
  });
}));

// ============================================================
//  ADMIN
// ============================================================
app.get('/api/admin/users', auth, requireAdmin, wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
  const q2 = String(req.query.q || '').toLowerCase().trim();
  const role = String(req.query.role || '');
  const sort = String(req.query.sort || 'newest');

  let users = await getUsers();
  if (q2) users = users.filter((u) => u.name.toLowerCase().includes(q2) || u.email.toLowerCase().includes(q2) || String(u.userCode || '').includes(q2));
  if (role === 'admin' || role === 'member') users = users.filter((u) => u.role === role);
  const topupMap = new Map();
  if (sort === 'topup') {
    // Task 79: precompute 1 lần thay vì gọi trong comparator (async)
    for (const u of users) topupMap.set(u.email, await getTotalTopup(u.email));
  }
  users.sort((a, b) => {
    switch (sort) {
      case 'oldest': return a.createdAt - b.createdAt;
      case 'balance': return b.balance - a.balance;
      case 'topup': return (topupMap.get(b.email) || 0) - (topupMap.get(a.email) || 0);
      default: return b.createdAt - a.createdAt;
    }
  });
  const total = users.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const slice = users.slice((page - 1) * pageSize, page * pageSize);
  res.json({
    ok: true,
    users: await Promise.all(slice.map(async (u) => ({ ...(await publicUser(u)), createdAt: u.createdAt, googleOnly: !!u.googleOnly }))),
    total, pageCount, page: Math.min(page, pageCount),
  });
}));

app.put('/api/admin/users/:email', auth, requireAdmin, wrap(async (req, res) => {
  const email = String(req.params.email).toLowerCase();
  const target = await getUser(email);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  const { name, role, avatar, vipOverride, balance, balanceDelta, balanceAction, balanceAdjust, amount } = req.body || {};
  const fields = {};
  if (typeof name === 'string' && name.trim().length >= 2) fields.name = name.trim();
  if (role === 'admin' || role === 'member') fields.role = role;
  if (typeof avatar === 'string' || avatar === null) fields.avatar = avatar;
  if (vipOverride === null || [0, 1, 2, 3, 4].includes(Number(vipOverride))) {
    fields.vipOverride = vipOverride === null ? null : Number(vipOverride);
  }
  let adminCredited = 0; // >0 khi admin cộng tiền (add / balanceAdjust dương) → phát topup cho user
  let newBalance = null; // Task 79: track balance sau khi cộng/trừ nguyên tử
  if (Number.isInteger(Number(balance)) && Number(balance) >= 0) {
    fields.balance = Number(balance);
    await createTransaction({ id: `TX-${Date.now()}`, email, type: 'admin_set', amount: Number(balance), timestamp: Date.now() });
  } else if (balanceAction === 'add' || balanceAction === 'sub') {
    const amt = Math.round(Number(amount) || 0);
    if (amt > 0) {
      // Task 79: cộng/trừ NGUYÊN TỬ (adjustBalance tự chặn âm)
      newBalance = await adjustBalance(email, balanceAction === 'add' ? amt : -amt);
      if (balanceAction === 'add') adminCredited = amt;
      await createTransaction({ id: `TX-${Date.now()}`, email, type: 'admin_topup', amount: balanceAction === 'add' ? amt : -(Math.min(amt, target.balance)), timestamp: Date.now() });
    }
  } else if (balanceAdjust !== undefined && Number.isFinite(Number(balanceAdjust)) && Number(balanceAdjust) !== 0) {
    // bundle cũ (UserEditModal) gửi balanceAdjust = số có dấu (dương cộng, âm trừ)
    const delta = Math.round(Number(balanceAdjust));
    newBalance = await adjustBalance(email, delta); // MAX(0, balance+delta) — nguyên tử
    const credited = delta > 0 ? Math.max(0, (newBalance ?? target.balance) - target.balance) : Math.max(0, target.balance - (newBalance ?? target.balance));
    if (delta > 0) adminCredited = credited;
    await createTransaction({ id: `TX-${Date.now()}`, email, type: 'admin_topup', amount: delta > 0 ? credited : -credited, timestamp: Date.now() });
  }
  await updateUser(email, fields);
  if (adminCredited > 0) {
    // Admin cộng tiền → user nhận modal + thông báo nạp thành công như webhook
    const updated = (await getUser(email)) || target;
    broadcast(`user:${email}`, 'user:updated', { email, reason: 'topup', actor: req.user.email, user: await publicUser(updated), topup: { amount: adminCredited, bonus: 0, balance: updated.balance, admin: true } });
  } else {
    await broadcastUserUpdated(email, req.user.email);
  }
  broadcast(null, 'users:changed', { type: 'updated', email, actor: req.user.email });
  broadcast(null, 'analytics:changed', { reason: 'admin-edit', email: req.user.email });
  res.json({ ok: true, user: await publicUser(await getUser(email)) });
}));

app.delete('/api/admin/users/:email', auth, requireAdmin, wrap(async (req, res) => {
  const email = String(req.params.email).toLowerCase();
  if (email === req.user.email) return res.status(400).json({ error: 'Không thể xóa chính mình' });
  const target = await getUser(email);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  await deleteUser(email);
  broadcast(`user:${email}`, 'user:deleted', { email, reason: 'deleted', actor: req.user.email });
  broadcast(null, 'users:changed', { type: 'deleted', email, actor: req.user.email });
  broadcast(null, 'analytics:changed', { reason: 'user-deleted', email: req.user.email });
  res.json({ ok: true });
}));

app.post('/api/admin/users/bulk', auth, requireAdmin, wrap(async (req, res) => {
  const { action, emails, role } = req.body || {};
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'Danh sách email trống' });
  const list = emails.map((e) => String(e).toLowerCase()).filter((e) => e && e !== req.user.email);
  const existing = [];
  for (const e of list) if (await getUser(e)) existing.push(e);
  const skipped = emails.map((e) => String(e).toLowerCase()).filter((e) => !e || e === req.user.email || !existing.includes(e));
  if (action === 'delete') {
    for (const e of existing) {
      await deleteUser(e);
      broadcast(`user:${e}`, 'user:deleted', { email: e, reason: 'deleted', actor: req.user.email });
    }
    broadcast(null, 'users:changed', { type: 'bulk-delete', count: existing.length, actor: req.user.email });
    broadcast(null, 'analytics:changed', { reason: 'bulk-delete', email: req.user.email });
    // bundle cũ đọc o.affected + o.skipped.length
    return res.json({ ok: true, deleted: existing.length, affected: existing.length, skipped });
  }
  if (action === 'role' && (role === 'admin' || role === 'member')) {
    for (const e of existing) {
      await updateUser(e, { role });
      await broadcastUserUpdated(e, req.user.email);
    }
    broadcast(null, 'users:changed', { type: 'bulk-role', count: existing.length, role, actor: req.user.email });
    return res.json({ ok: true, updated: existing.length, affected: existing.length, skipped });
  }
  return res.status(400).json({ error: 'Hành động không hợp lệ' });
}));

app.get('/api/admin/orders', auth, requireAdmin, wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
  const status = String(req.query.status || '');
  const q2 = String(req.query.q || '').toLowerCase().trim();
  let orders = await dbAllOrders();
  if (status) orders = orders.filter((o) => o.status === status);
  if (q2) orders = orders.filter((o) => o.id.toLowerCase().includes(q2) || o.email.toLowerCase().includes(q2) || o.customer.toLowerCase().includes(q2));
  orders.sort((a, b) => b.timestamp - a.timestamp);
  const total = orders.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const slice = orders.slice((page - 1) * pageSize, page * pageSize);
  res.json({ ok: true, orders: slice, total, pageCount, page: Math.min(page, pageCount) });
}));

async function dbAllOrders() {
  const users = await getUsers();
  const nameMap = new Map(users.map((u) => [u.email, u.name]));
  return (await q('SELECT * FROM orders')).map((o) => ({
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

app.put('/api/admin/orders/:id', auth, requireAdmin, wrap(async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  const { status } = req.body || {};
  if (!['Hoàn thành', 'Đang xử lý', 'Đã hủy'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }
  await updateOrderStatus(order.id, status);
  broadcast(`user:${order.email}`, 'order:updated', { email: order.email, orderId: order.id, status });
  broadcast(null, 'analytics:changed', { reason: 'order-status', email: req.user.email });
  res.json({ ok: true, order: await getOrder(order.id) });
}));

// ----- Admin payments -----
app.get('/api/admin/payments/config', auth, requireAdmin, wrap(async (req, res) => {
  const secret = await getSetting('webhook_secret');
  res.json({
    ok: true,
    hasSecret: !!secret,
    secret,
    // bundle cũ đọc: e.endpoint, e.secret, e.bank.name/.short/.accountNo/.accountName
    endpoint: '/api/payments/webhook',
    bank: {
      name: 'Vietcombank',
      short: 'VCB',
      bin: BANK.bin,
      accountNo: BANK.accountNumber,
      accountNumber: BANK.accountNumber,
      accountName: BANK.accountName,
    },
    momo: { number: '0368852235', name: 'NGUYỄN THẾ LƯƠNG' },
    webhookPath: '/api/payments/webhook',
    createdAt: Number(await getSetting('webhook_secret_created')) || null,
  });
}));

app.post('/api/admin/payments/config/secret', auth, requireAdmin, wrap(async (req, res) => {
  const custom = String(req.body?.secret || '').trim();
  const secret = custom.length >= 8 ? custom : crypto.randomBytes(16).toString('hex');
  await setSetting('webhook_secret', secret);
  await setSetting('webhook_secret_created', String(Date.now()));
  res.json({ ok: true, secret });
}));

app.get('/api/admin/payments', auth, requireAdmin, wrap(async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
  const all = await listPayments(1000000);
  const payments = all.slice(0, limit).map((p) => ({ ...p, result: p.result ? JSON.parse(p.result) : null }));
  // bundle cũ đọc t.total (tổng số payment)
  res.json({ ok: true, payments, total: all.length });
}));

app.get('/api/admin/payments/logs', auth, requireAdmin, wrap(async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  res.json({ ok: true, logs: await getWebhookLogs(limit) });
}));

// ============================================================
//  ANALYTICS
// ============================================================
app.get('/api/analytics', auth, wrap(async (req, res) => {
  try {
    res.json(await getAnalytics());
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Không thể tính toán dữ liệu phân tích' });
  }
}));

app.get('/api/analytics/daily', auth, wrap(async (req, res) => {
  try {
    // bundle cũ đọc (await ...).daily || [] → phải bọc {daily: [...]}
    res.json({ ok: true, daily: await getDailyRevenue(req.query.month) });
  } catch (err) {
    console.error('Analytics daily error:', err);
    res.status(500).json({ error: 'Không thể tính doanh thu theo ngày' });
  }
}));

// ============================================================
//  CHAT AI — ai.js 2 chế độ: ZAI_API_KEY (public open platform) / SDK internal (sandbox)
// ============================================================

app.get('/api/chat', auth, wrap(async (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  if (!sessionId) return res.status(400).json({ error: 'Thiếu sessionId' });
  const messages = (await getChatMessages(req.user.email, sessionId)).map((m) => ({
    role: m.role, content: m.content, createdAt: m.createdAt,
  }));
  res.json({ ok: true, messages });
}));

app.post('/api/chat', auth, async (req, res) => {
  const { sessionId, message } = req.body || {};
  const sid = String(sessionId || '');
  const text = String(message || '').trim();
  if (!sid || !text) return res.status(400).json({ error: 'Thiếu sessionId hoặc nội dung' });
  if (text.length > 2000) return res.status(400).json({ error: 'Tin nhắn quá dài (tối đa 2000 ký tự)' });

  await addChatMessage(req.user.email, sid, 'user', text);
  try {
    const history = (await getChatMessages(req.user.email, sid)).slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    const reply = (await chatComplete([
      {
        role: 'system',
        content:
          'Bạn là trợ lý CSKH của shop acc Netflix Trial (Netflix Trial 30 days — 20.000đ/slot, 100 slot). ' +
          'Trả lời ngắn gọn, thân thiện, tiếng Việt. Hướng dẫn: nạp tiền qua trang "Nạp số dư" (QR tự động), ' +
          'mua ở trang "Sản phẩm", đơn mới luôn "Đang xử lý" cho tới khi shop gửi thông tin. ' +
          'Khi được hỏi gì ngoài phạm vi shop, trả lời lịch sự và đưa về chủ đề mua hàng/nạp tiền.',
      },
      ...history,
    ])) || 'Xin lỗi, mình chưa trả lời được. Bạn thử lại nhé!';
    await addChatMessage(req.user.email, sid, 'assistant', reply);
    res.json({ ok: true, response: reply });
  } catch (err) {
    console.error('[chat] LLM error:', err.message);
    // Task 82: lỗi rõ ràng thay vì 'AI đang bận' mù mờ — user biết ngay thiếu gì
    const detail = String(err.message || err).slice(0, 180);
    let hint;
    if (aiMode() !== 'public-api' && /fetch failed|ENETUNREACH|EHOSTUNREACH|ETIMEDOUT|ECONNREFUSED|internal-api/i.test(detail)) {
      hint = 'Trợ lý AI chưa cấu hình cho môi trường này (thiếu env ZAI_API_KEY — key open platform z.ai, xem DEPLOY.md mục Chatbot AI)';
    } else {
      hint = 'Trợ lý AI đang bận, thử lại sau ít phút';
    }
    res.status(500).json({ error: hint, detail, mode: aiMode() });
  }
});

app.delete('/api/chat/:sessionId', auth, wrap(async (req, res) => {
  await clearChatMessages(req.user.email, String(req.params.sessionId));
  res.json({ ok: true });
}));

// ============================================================
//  DEPLOY MODE — static SPA + socket.io in-process (Render/hosting 1 process)
// ============================================================
if (DEPLOY) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webRoot = path.join(__dirname, '..', 'public'); // bundle SPA đã build

  // Serve SPA tại /app (bundle build với base=/app/) — mọi fetch('/api/…') cùng origin
  app.use('/app', express.static(webRoot));
  app.get('/', (req, res) => res.redirect('/app/'));

  // socket.io gắn trực tiếp vào Express — client SPA nối same-origin (path mặc định /socket.io)
  const httpServer = http.createServer(app);
  const deployIo = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  deployIo.use((socket, next) => {
    const token = (socket.handshake.auth && socket.handshake.auth.token) || socket.handshake.query?.token;
    if (!token) return next(new Error('Unauthorized: missing token'));
    try {
      const payload = jwt.verify(String(token), JWT_SECRET);
      if (!payload.email) return next(new Error('Unauthorized: invalid token payload'));
      socket.data.email = String(payload.email).toLowerCase();
      next();
    } catch {
      next(new Error('Unauthorized: invalid token'));
    }
  });
  deployIo.on('connection', (socket) => {
    const email = socket.data.email;
    socket.join(`user:${email}`);
    console.log(`[realtime] connected ${email} (${socket.id})`);
    socket.on('disconnect', (reason) => console.log(`[realtime] disconnected ${email} — ${reason}`));
  });
  setRealtimeLocal(deployIo);

  httpServer.listen(PORT, () => {
    console.log(`DEPLOY mode — web + API + realtime on http://localhost:${PORT}`);
  });
} else {
  // ============================================================
  //  START (sandbox mode)
  // ============================================================
  app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
    connectRealtimeBridge();
  });
}
