import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { io as ioClient } from 'socket.io-client';
import {
  getUser,
  getUsers,
  createUser,
  updateUser,
  getPurchases,
  addPurchase,
  getOrders,
  createOrder,
  createTransaction,
  getTotalTopup,
} from './db.js';
import { getAnalytics, getDailyRevenue } from './analytics.js';
import { getAdminUsersPage, bulkDeleteUsers, bulkSetRole } from './admin.js';

// ---------- Email ----------
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function sendVerificationEmail(email, code) {
  if (!transporter) {
    console.log(`[MAIL DEMO] Verification code for ${email}: ${code}`);
    return;
  }
  transporter
    .sendMail({
      from: MAIL_FROM || SMTP_USER,
      to: email,
      subject: 'Mã xác nhận - Analytics Dashboard',
      html: `<p>Mã xác nhận của bạn là: <b style="font-size:24px">${code}</b></p><p>Mã có hiệu lực 5 phút.</p>`,
    })
    .catch((err) => console.error('Mail error:', err.message));
}

// ---------- Helpers ----------
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Realtime broadcast ----------
// Kết nối tới mini-service socket.io (port 3003) như một client "system"
// (server-to-server, KHÔNG qua gateway) và phát event khi dữ liệu thay đổi.
// Fire-and-forget: nếu realtime service lỗi, API vẫn hoạt động bình thường.
const REALTIME_URL = process.env.REALTIME_URL || 'http://localhost:3003';
const SYSTEM_EMAIL = 'system@realtime.internal';
const systemToken = jwt.sign({ email: SYSTEM_EMAIL, role: 'system' }, JWT_SECRET);
const rtSocket = ioClient(REALTIME_URL, {
  auth: { token: systemToken },
  path: '/',
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
rtSocket.on('connect', () => console.log('[realtime] system channel đã kết nối'));
rtSocket.on('disconnect', (reason) => console.log(`[realtime] system channel mất kết nối — ${reason}`));
rtSocket.on('connect_error', (err) => console.warn('[realtime] connect_error:', err.message));

function broadcast(room, event, payload) {
  if (!rtSocket.connected) return; // offline: bỏ qua, event sau sẽ đồng bộ lại
  rtSocket.emit('broadcast', { room: room || null, event, payload });
}
function broadcastUserUpdated(email, user, reason, actor) {
  broadcast(`user:${String(email).toLowerCase()}`, 'user:updated', { email, user, reason, actor });
  broadcast(null, 'users:changed', { type: 'updated', email, actor });
}

// ---------- VIP (theo tổng tiền đã nạp) ----------
const VIP_TIERS = [
  { level: 1, name: 'Đồng', min: 100000, bonusPct: 5 },
  { level: 2, name: 'Bạc', min: 500000, bonusPct: 10 },
  { level: 3, name: 'Vàng', min: 1000000, bonusPct: 15 },
  { level: 4, name: 'Kim Cương', min: 5000000, bonusPct: 20 },
];

function vipTierOf(totalTopup) {
  let tier = null;
  for (const t of VIP_TIERS) {
    if (totalTopup >= t.min) tier = t;
  }
  return tier;
}

function publicUser(user) {
  const purchases = getPurchases(user.email);
  const totalTopup = getTotalTopup(user.email);
  const tier = vipTierOf(totalTopup);
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance,
    purchasedUpgrades: purchases,
    avatar: user.avatar || undefined,
    totalTopup,
    vip: tier ? { level: tier.level, name: tier.name, bonusPct: tier.bonusPct } : null,
  };
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
  }
}

// ---------- Seed admin ----------
async function seedAdmin() {
  const existing = getUser('admin@luongkun.io');
  if (!existing) {
    const hashed = await bcrypt.hash('123456', 10);
    createUser({
      email: 'admin@luongkun.io',
      name: 'Lương Kun',
      password: hashed,
      role: 'admin',
      balance: 250000000,
      createdAt: Date.now(),
    });
    console.log('Seeded demo admin: admin@luongkun.io / 123456');
  }
}
await seedAdmin();

// ---------- App ----------
const app = express();
app.use(cors());
app.use(express.json());

// ----- Security headers -----
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ----- Rate limit đăng nhập (chống brute-force) -----
// Tối đa 5 lần sai liên tiếp / email → khóa 5 phút; đăng nhập đúng sẽ reset.
// (Giới hạn theo email vì mọi request đều đến từ proxy nội bộ 127.0.0.1)
const loginFailures = new Map(); // email -> { count, lockUntil }
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;

function loginLockedFor(email) {
  const rec = loginFailures.get(email);
  if (!rec) return 0;
  if (rec.lockUntil > Date.now()) return Math.ceil((rec.lockUntil - Date.now()) / 1000);
  if (rec.lockUntil) loginFailures.delete(email); // hết thời gian khóa
  return 0;
}

function recordLoginFailure(email) {
  const rec = loginFailures.get(email) || { count: 0, lockUntil: 0 };
  rec.count += 1;
  if (rec.count >= LOGIN_MAX_FAILS) {
    rec.lockUntil = Date.now() + LOGIN_LOCK_MS;
    console.log(`[security] Tạm khóa đăng nhập ${email} trong ${LOGIN_LOCK_MS / 60000} phút (${rec.count} lần sai liên tiếp)`);
  }
  loginFailures.set(email, rec);
}

// ----- Auth -----
app.get('/api/auth/me', auth, (req, res) => {
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  res.json({ ok: true, user: publicUser(user) });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim().toLowerCase();
  if (trimmedName.length < 2) return res.status(400).json({ error: 'Tên tối thiểu 2 ký tự' });
  if (!EMAIL_RE.test(trimmedEmail)) return res.status(400).json({ error: 'Email không hợp lệ' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  if (getUser(trimmedEmail)) return res.status(409).json({ error: 'Email đã được đăng ký' });

  const hashed = await bcrypt.hash(password, 10);
  createUser({
    name: trimmedName,
    email: trimmedEmail,
    password: hashed,
    role: 'member',
    balance: 0,
    createdAt: Date.now(),
  });
  const token = jwt.sign({ email: trimmedEmail }, JWT_SECRET, { expiresIn: '7d' });
  const user = getUser(trimmedEmail);
  broadcast(null, 'users:changed', { type: 'created', email: trimmedEmail, actor: trimmedEmail });
  res.json({ ok: true, token, user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(trimmedEmail)) return res.status(400).json({ error: 'Email không hợp lệ' });
  const lockedFor = loginLockedFor(trimmedEmail);
  if (lockedFor > 0) {
    res.setHeader('Retry-After', String(lockedFor));
    return res.status(429).json({ error: `Đăng nhập tạm bị khóa do quá nhiều lần sai. Vui lòng thử lại sau ${lockedFor} giây.` });
  }
  const user = getUser(trimmedEmail);
  if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
  if (user.googleOnly) return res.status(400).json({ error: 'Tài khoản này đăng nhập bằng Google' });
  const ok = await bcrypt.compare(password || '', user.password);
  if (!ok) {
    recordLoginFailure(trimmedEmail);
    return res.status(401).json({ error: 'Mật khẩu không đúng' });
  }
  loginFailures.delete(trimmedEmail); // đăng nhập đúng → xóa lịch sử sai
  const token = jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, token, user: publicUser(user) });
});

app.post('/api/auth/google', async (req, res) => {
  const { accessToken } = req.body || {};
  if (!accessToken) return res.status(400).json({ error: 'Thiếu Google access token' });
  try {
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userinfoRes.ok) return res.status(401).json({ error: 'Google token không hợp lệ' });
    const profile = await userinfoRes.json();
    const email = (profile.email || '').toLowerCase();
    if (!email || profile.verified_email === false) {
      return res.status(401).json({ error: 'Không lấy được email Google đã xác thực' });
    }
    let user = getUser(email);
    if (!user) {
      createUser({
        name: profile.name || email.split('@')[0],
        email,
        password: null,
        googleOnly: true,
        role: 'member',
        balance: 0,
        createdAt: Date.now(),
      });
      user = getUser(email);
    }
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user: publicUser(user) });
  } catch (err) {
    console.error('Google verify error:', err.message);
    res.status(401).json({ error: 'Xác thực Google thất bại' });
  }
});

// ----- Verification codes -----
const pendingCodes = new Map();

app.post('/api/auth/send-code', auth, (req, res) => {
  const email = req.user.email;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingCodes.set(email, { code, expires: Date.now() + 5 * 60 * 1000 });
  sendVerificationEmail(email, code);
  const demo = !transporter;
  res.json({ ok: true, demo, code: demo ? code : undefined });
});

function verifyCode(email, code) {
  const pending = pendingCodes.get(email);
  if (!pending) return 'Chưa gửi mã xác nhận';
  if (Date.now() > pending.expires) return 'Mã đã hết hạn, vui lòng gửi lại';
  if (pending.code !== (code || '').trim()) return 'Mã xác nhận không đúng';
  return null;
}

app.post('/api/auth/change-email', auth, (req, res) => {
  const { code, newEmail } = req.body || {};
  const err = verifyCode(req.user.email, code);
  if (err) return res.status(400).json({ error: err });
  const trimmed = (newEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return res.status(400).json({ error: 'Email mới không hợp lệ' });
  if (trimmed === req.user.email) return res.status(400).json({ error: 'Email mới trùng email hiện tại' });
  if (getUser(trimmed)) return res.status(409).json({ error: 'Email mới đã được sử dụng bởi tài khoản khác' });

  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  pendingCodes.delete(req.user.email);
  updateUser(req.user.email, { email: trimmed });
  // Các phiên đăng nhập khác của email cũ sẽ bị đăng xuất (token cũ hết hiệu lực)
  broadcast(`user:${req.user.email}`, 'user:deleted', { email: req.user.email, reason: 'email-changed', actor: req.user.email });
  broadcast(null, 'users:changed', { type: 'updated', email: trimmed, actor: req.user.email });
  const token = jwt.sign({ email: trimmed }, JWT_SECRET, { expiresIn: '7d' });
  const updated = getUser(trimmed);
  res.json({ ok: true, token, user: publicUser(updated) });
});

app.post('/api/auth/change-password', auth, async (req, res) => {
  const { code, currentPassword, newPassword } = req.body || {};
  const err = verifyCode(req.user.email, code);
  if (err) return res.status(400).json({ error: err });
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  if (user.password) {
    const ok = await bcrypt.compare(currentPassword || '', user.password);
    if (!ok) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  }
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
  if (user.password && (await bcrypt.compare(newPassword, user.password))) {
    return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
  }
  pendingCodes.delete(req.user.email);
  const hashed = await bcrypt.hash(newPassword, 10);
  updateUser(req.user.email, { password: hashed, googleOnly: false });
  res.json({ ok: true });
});

// ----- Profile -----
app.put('/api/profile', auth, (req, res) => {
  const { name, avatar } = req.body || {};
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  const updates = {};
  if (name !== undefined) {
    const trimmed = (name || '').trim();
    if (trimmed.length < 2 || trimmed.length > 50) return res.status(400).json({ error: 'Tên 2-50 ký tự' });
    updates.name = trimmed;
  }
  if (avatar !== undefined) updates.avatar = avatar;
  if (Object.keys(updates).length) updateUser(req.user.email, updates);
  const updated = getUser(req.user.email);
  broadcastUserUpdated(req.user.email, publicUser(updated), 'profile', req.user.email);
  res.json({ ok: true, user: publicUser(updated) });
});

app.post('/api/profile/migrate', auth, (req, res) => {
  const { name, avatar, purchasedUpgrades, balance } = req.body || {};
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });

  const updates = {};
  if (name && typeof name === 'string' && name.trim().length >= 2 && !user.name) {
    updates.name = name.trim();
  }
  if (avatar && typeof avatar === 'string' && !user.avatar) {
    updates.avatar = avatar;
  }
  if (Object.keys(updates).length) updateUser(req.user.email, updates);

  if (Array.isArray(purchasedUpgrades)) {
    for (const id of purchasedUpgrades) {
      if (typeof id === 'string') addPurchase(req.user.email, id);
    }
  }

  const legacyBalance = Number(balance);
  if (Number.isFinite(legacyBalance) && legacyBalance > user.balance) {
    updateUser(req.user.email, { balance: Math.round(legacyBalance) });
  }

  const updated = getUser(req.user.email);
  broadcastUserUpdated(req.user.email, publicUser(updated), 'migrate', req.user.email);
  res.json({ ok: true, user: publicUser(updated) });
});

// ----- Balance / Topup -----
app.post('/api/balance/topup', auth, (req, res) => {
  const { amount } = req.body || {};
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 10000) return res.status(400).json({ error: 'Số tiền nạp tối thiểu 10.000đ' });
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  // Thưởng theo mệnh giá (như cũ) + thưởng VIP theo hạng hiện tại
  const baseBonus = value >= 1000000 ? Math.round(value * 0.05) : value >= 500000 ? Math.round(value * 0.02) : 0;
  const prevTotal = getTotalTopup(user.email);
  const prevTier = vipTierOf(prevTotal);
  const vipBonus = prevTier ? Math.round((value * prevTier.bonusPct) / 100) : 0;
  const bonus = baseBonus + vipBonus;
  const newBalance = user.balance + value + bonus;
  updateUser(req.user.email, { balance: newBalance });
  createTransaction({
    id: `TX-${Date.now()}`,
    email: user.email,
    type: 'topup',
    amount: value,
    bonus,
    timestamp: Date.now(),
  });
  const updated = getUser(req.user.email);
  const newTotal = prevTotal + value;
  const newTier = vipTierOf(newTotal);
  const tierUp = newTier && (!prevTier || newTier.level > prevTier.level) ? newTier : null;
  broadcastUserUpdated(req.user.email, publicUser(updated), 'topup', req.user.email);
  res.json({
    ok: true,
    balance: updated.balance,
    bonus,
    baseBonus,
    vipBonus,
    totalTopup: newTotal,
    vip: newTier ? { level: newTier.level, name: newTier.name, bonusPct: newTier.bonusPct } : null,
    tierUp: tierUp ? { level: tierUp.level, name: tierUp.name } : null,
    transaction: { id: `TX-${Date.now()}`, amount: value, bonus },
  });
});

// ----- Products -----
app.get('/api/products', (req, res) => {
  res.json({ ok: true, products: [] });
});

// ----- Analytics (tổng hợp từ DB thật) -----
app.get('/api/analytics', auth, (req, res) => {
  try {
    const data = getAnalytics();
    res.json(data);
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

// ----- Orders -----
app.post('/api/orders', auth, (req, res) => {
  const { items, total } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Giỏ hàng trống' });
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  if (user.balance < total) return res.status(400).json({ error: 'Số dư không đủ' });
  updateUser(req.user.email, { balance: user.balance - total });
  const order = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    email: user.email,
    items,
    total,
    timestamp: Date.now(),
  };
  createOrder(order);
  const updated = getUser(req.user.email);
  broadcast(`user:${user.email}`, 'order:created', { email: user.email, order, actor: user.email });
  broadcast(null, 'analytics:changed', { reason: 'order:created', email: user.email });
  broadcastUserUpdated(req.user.email, publicUser(updated), 'order', req.user.email);
  res.json({ ok: true, order, balance: updated.balance });
});

app.get('/api/orders', auth, (req, res) => {
  const orders = getOrders(req.user.email);
  res.json({ ok: true, orders });
});

// ----- Upgrades -----
app.post('/api/upgrades/purchase', auth, (req, res) => {
  const { upgradeId, price } = req.body || {};
  const user = getUser(req.user.email);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  const purchases = getPurchases(user.email);
  if (purchases.includes(upgradeId)) return res.status(400).json({ error: 'Đã sở hữu gói này' });
  if (user.balance < price) return res.status(400).json({ error: 'Số dư không đủ' });
  updateUser(req.user.email, { balance: user.balance - price });
  addPurchase(user.email, upgradeId);
  createTransaction({
    id: `TX-${Date.now()}`,
    email: user.email,
    type: 'upgrade',
    amount: price,
    timestamp: Date.now(),
  });
  const updated = getUser(req.user.email);
  const newPurchases = getPurchases(user.email);
  broadcastUserUpdated(req.user.email, publicUser(updated), 'upgrade', req.user.email);
  res.json({ ok: true, balance: updated.balance, purchasedUpgrades: newPurchases });
});

// ----- Admin -----
app.get('/api/admin/users', auth, (req, res) => {
  const user = getUser(req.user.email);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Yêu cầu quyền quản trị viên' });
  }
  const { page, pageSize, q, role, sort } = req.query;
  const result = getAdminUsersPage({
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 10,
    q: String(q || ''),
    role: String(role || 'all'),
    sort: String(sort || 'newest'),
  });
  res.json({ ok: true, ...result });
});

// Hành động hàng loạt: xóa nhiều user hoặc đổi vai trò nhiều user
app.post('/api/admin/users/bulk', auth, (req, res) => {
  const admin = getUser(req.user.email);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Yêu cầu quyền quản trị viên' });
  }
  const { action, emails, role } = req.body || {};
  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Chưa chọn người dùng nào' });
  }
  if (emails.length > 200) {
    return res.status(400).json({ error: 'Tối đa 200 tài khoản mỗi lần' });
  }
  if (action === 'delete') {
    const { deleted, skipped } = bulkDeleteUsers(emails, req.user.email);
    for (const email of deleted) {
      broadcast(`user:${email}`, 'user:deleted', { email, reason: 'deleted', actor: req.user.email });
    }
    broadcast(null, 'users:changed', { type: 'bulk-delete', count: deleted.length, actor: req.user.email });
    broadcast(null, 'analytics:changed', { reason: 'bulk-delete', count: deleted.length });
    return res.json({ ok: true, affected: deleted.length, deleted, skipped });
  }
  if (action === 'role') {
    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }
    const { updated, skipped } = bulkSetRole(emails, role, req.user.email);
    for (const email of updated) {
      const u = getUser(email);
      if (u) {
        broadcast(`user:${email}`, 'user:updated', { email, user: publicUser(u), reason: 'admin-bulk-role', actor: req.user.email });
      }
    }
    broadcast(null, 'users:changed', { type: 'bulk-role', count: updated.length, actor: req.user.email });
    return res.json({ ok: true, affected: updated.length, updated, skipped });
  }
  return res.status(400).json({ error: 'Hành động không hợp lệ' });
});

app.put('/api/admin/users/:email', auth, async (req, res) => {
  const admin = getUser(req.user.email);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Yêu cầu quyền quản trị viên' });
  }
  const { email } = req.params;
  const { balance, balanceAdjust, role } = req.body;
  const target = getUser(email);
  if (!target) return res.status(404).json({ error: 'Người dùng không tồn tại' });
  if (email === 'admin@luongkun.io' && role !== undefined && role !== 'admin') {
    return res.status(400).json({ error: 'Không thể hạ cấp tài khoản admin chính' });
  }
  const updates = {};
  let adjustDelta = null;
  if (typeof balanceAdjust === 'number' && Number.isFinite(balanceAdjust) && Math.round(balanceAdjust) !== 0) {
    // Điều chỉnh tăng/giảm (cộng dồn vào số dư hiện tại) — không phải set tuyệt đối
    adjustDelta = Math.round(balanceAdjust);
    const newBalance = target.balance + adjustDelta;
    if (newBalance < 0) {
      return res.status(400).json({ error: `Không thể trừ ${formatVnd(-adjustDelta)} — số dư hiện tại chỉ ${formatVnd(target.balance)}` });
    }
    updates.balance = newBalance;
  } else if (typeof balance === 'number' && balance >= 0) {
    updates.balance = Math.round(balance);
  }
  if (role && (role === 'admin' || role === 'member')) updates.role = role;
  if (Object.keys(updates).length) updateUser(email, updates);
  // Giao dịch điều chỉnh thủ công:
  // - CỘNG tiền: type 'admin_topup' → TÍNH vào tổng nạp (totalTopup) ⇒ VIP tăng hạng như nạp thật
  // - TRỪ tiền: type 'admin_adjust' → chỉ trừ số dư, không ảnh hưởng tổng nạp/VIP
  let tierUp = null;
  if (adjustDelta !== null) {
    const isAdd = adjustDelta > 0;
    const prevTotal = getTotalTopup(email);
    createTransaction({
      id: `tx_admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      type: isAdd ? 'admin_topup' : 'admin_adjust',
      amount: adjustDelta,
      bonus: 0,
      timestamp: Date.now(),
    });
    if (isAdd) {
      const prevTier = vipTierOf(prevTotal);
      const newTier = vipTierOf(prevTotal + adjustDelta);
      tierUp = newTier && (!prevTier || newTier.level > prevTier.level) ? newTier : null;
    }
  }
  const updated = getUser(email);
  broadcastUserUpdated(email, publicUser(updated), 'admin-edit', req.user.email);
  res.json({
    ok: true,
    user: publicUser(updated),
    ...(adjustDelta !== null ? { adjust: { delta: adjustDelta, newBalance: updated.balance } } : {}),
    ...(tierUp ? { tierUp: { level: tierUp.level, name: tierUp.name, bonusPct: tierUp.bonusPct } } : {}),
  });
});

function formatVnd(n) {
  return `${n.toLocaleString('vi-VN')}đ`;
}

app.delete('/api/admin/users/:email', auth, async (req, res) => {
  const admin = getUser(req.user.email);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Yêu cầu quyền quản trị viên' });
  }
  const { email } = req.params;
  if (email === 'admin@luongkun.io') {
    return res.status(400).json({ error: 'Không thể xóa tài khoản admin chính' });
  }
  const target = getUser(email);
  if (!target) return res.status(404).json({ error: 'Người dùng không tồn tại' });
  // Xóa user, purchases, orders, transactions (có thể dùng cascade trong SQLite, nhưng ở đây ta xóa thủ công)
  const db = (await import('better-sqlite3')).default;
  const conn = db('src/data/app.db');
  conn.exec('BEGIN TRANSACTION;');
  try {
    conn.prepare('DELETE FROM purchases WHERE email = ?').run(email);
    conn.prepare('DELETE FROM orders WHERE email = ?').run(email);
    conn.prepare('DELETE FROM transactions WHERE email = ?').run(email);
    conn.prepare('DELETE FROM users WHERE email = ?').run(email);
    conn.exec('COMMIT;');
    broadcast(`user:${email}`, 'user:deleted', { email, reason: 'deleted', actor: req.user.email });
    broadcast(null, 'users:changed', { type: 'deleted', email, actor: req.user.email });
    res.json({ ok: true });
  } catch (err) {
    conn.exec('ROLLBACK;');
    res.status(500).json({ error: 'Không thể xóa người dùng' });
  }
});

// ----- Health -----
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));