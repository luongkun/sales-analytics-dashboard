/**
 * db.js — SQLite (better-sqlite3) cho Sales Analytics Dashboard
 * Source of truth: users, orders, transactions, products (slot), payments...
 * DB file: src/data/app.db (được commit trong git — sống sót qua sandbox reset)
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT,
    password TEXT,
    role TEXT DEFAULT 'member',
    balance INTEGER DEFAULT 0,
    avatar TEXT,
    googleOnly INTEGER DEFAULT 0,
    userCode INTEGER,
    vipOverride INTEGER,
    region TEXT,
    source TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS purchases (
    email TEXT,
    upgradeId TEXT,
    PRIMARY KEY (email, upgradeId),
    FOREIGN KEY (email) REFERENCES users(email)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    email TEXT,
    items TEXT,
    total INTEGER,
    status TEXT DEFAULT 'Hoàn thành',
    timestamp INTEGER,
    FOREIGN KEY (email) REFERENCES users(email)
  );
  CREATE INDEX IF NOT EXISTS idx_orders_ts ON orders(timestamp DESC);

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    email TEXT,
    type TEXT,
    amount INTEGER,
    bonus INTEGER DEFAULT 0,
    timestamp INTEGER,
    FOREIGN KEY (email) REFERENCES users(email)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (email) REFERENCES users(email)
  );
  CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(email, sessionId, id);

  CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    content TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    result TEXT,
    providerRef TEXT,
    createdAt INTEGER,
    expiresAt INTEGER,
    paidAt INTEGER,
    FOREIGN KEY (email) REFERENCES users(email)
  );
  CREATE INDEX IF NOT EXISTS idx_payment_email ON payment_requests(email, createdAt);

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    ip TEXT,
    provider TEXT,
    ok INTEGER NOT NULL,
    reason TEXT,
    content TEXT,
    amount INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_ts ON webhook_logs(ts DESC);

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    totalSlots INTEGER NOT NULL DEFAULT 100,
    bookedSlots INTEGER NOT NULL DEFAULT 0,
    gradient TEXT,
    icon TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sortOrder INTEGER DEFAULT 0
  );
`);

// ----- Migration nhẹ (idempotent): thêm cột cho DB cũ -----
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
ensureColumn('users', 'region', 'region TEXT');
ensureColumn('users', 'source', 'source TEXT');
ensureColumn('users', 'vipOverride', 'vipOverride INTEGER');
ensureColumn('users', 'userCode', 'userCode INTEGER');

// ============================================================
//  SEED — chỉ chạy lần đầu (bảng users rỗng)
// ============================================================
function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return;
  console.log('[db] Seed dữ liệu ban đầu...');

  const now = Date.now();
  const DAY = 86_400_000;

  // ---- Webhook secret ----
  const secret = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('webhook_secret', secret);
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('webhook_secret_created', String(now));
  console.log('[db] Webhook secret mới:', secret);

  // ---- Users ----
  const insertUser = db.prepare(`
    INSERT INTO users (email, name, password, role, balance, avatar, userCode, vipOverride, region, source, createdAt)
    VALUES (@email, @name, @password, @role, @balance, @avatar, @userCode, @vipOverride, @region, @source, @createdAt)
  `);
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Admin chính
  insertUser.run({
    email: 'admin@luongkun.io',
    name: 'Luong Kun',
    password: hash('123456'),
    role: 'admin',
    balance: 7_321_499,
    avatar: null,
    userCode: 100001,
    vipOverride: null,
    region: 'Miền Nam',
    source: 'organic',
    createdAt: now - 400 * DAY,
  });

  // Users demo
  const demoUsers = [
    ['lyhoangduyen@demo.luongkun.io', 'Lý Hoàng Duyên', 2_150_000, 1_250_000, 'Miền Nam'],
    ['tranhuuan@demo.luongkun.io', 'Trần Hữu An', 890_000, 1_530_000, 'Miền Nam'],
    ['nguyenvananh@demo.luongkun.io', 'Nguyễn Văn Anh', 120_000, 680_000, 'Miền Bắc'],
    ['phamthimai@demo.luongkun.io', 'Phạm Thị Mai', 3_400_000, 4_120_000, 'Miền Bắc'],
    ['levanbinh@demo.luongkun.io', 'Lê Văn Bình', 45_000, 120_000, 'Miền Trung'],
    ['dangthilan@demo.luongkun.io', 'Đặng Thị Lan', 1_780_000, 2_450_000, 'Miền Nam'],
    ['hoangminhduc@demo.luongkun.io', 'Hoàng Minh Đức', 320_000, 560_000, 'Miền Trung'],
    ['buiquynhnhu@demo.luongkun.io', 'Bùi Quỳnh Nhu', 5_600_000, 5_920_000, 'Miền Nam'],
    ['ngothanhson@demo.luongkun.io', 'Ngô Thành Sơn', 15_000, 60_000, 'Miền Bắc'],
    ['dovankhanh@demo.luongkun.io', 'Đỗ Văn Khanh', 720_000, 1_180_000, 'Miền Nam'],
    ['trinhthiminhan@demo.luongkun.io', 'Trịnh Thị Minh Anh', 240_000, 380_000, 'Miền Bắc'],
    ['duchuy@demo.luongkun.io', 'Phạm Đức Huy', 1_120_000, 1_860_000, 'Miền Trung'],
  ];
  let code = 100002;
  demoUsers.forEach(([email, name, balance, topup, region], i) => {
    insertUser.run({
      email, name,
      password: hash('123456'),
      role: 'member',
      balance,
      avatar: 'gradient:' + ['default', 'purple', 'emerald', 'orange', 'rose', 'slate'][i % 6],
      userCode: code++,
      vipOverride: null,
      region,
      source: ['organic', 'facebook', 'google', 'referral'][i % 4],
      createdAt: now - (30 + i * 12) * DAY,
    });
  });

  // ---- Transactions (topup demo — để totalTopup/VIP đúng) ----
  const insertTx = db.prepare(
    'INSERT INTO transactions (id, email, type, amount, bonus, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  );
  let txSeq = 1;
  const addTopups = (email, total, parts) => {
    let remain = total;
    for (let i = 0; i < parts; i++) {
      const isLast = i === parts - 1;
      const amt = isLast ? remain : Math.floor(total / parts / 10000) * 10000;
      remain -= amt;
      if (amt <= 0) continue;
      insertTx.run(`TX-${now}-${txSeq++}`, email, 'topup', amt, Math.floor(amt * 0.1), now - (60 - i * 10) * DAY);
    }
  };
  addTopups('admin@luongkun.io', 5_621_499, 5);
  demoUsers.forEach(([email, , , topup]) => addTopups(email, topup, 2));

  // ---- Products ----
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, description, price, totalSlots, bookedSlots, gradient, icon, active, sortOrder)
    VALUES (@id, @name, @description, @price, @totalSlots, @bookedSlots, @gradient, @icon, @active, @sortOrder)
  `);
  const PRODUCTS = [
    { id: 'PRD-NETFLIX', name: 'Netflix Trial 30 days', description: 'Dùng thử Netflix Premium trọn 30 ngày — 4K Ultra HD, xem trên 4 thiết bị, hủy bất cứ lúc nào.', price: 20_000, totalSlots: 100, bookedSlots: 12, gradient: 'from-red-600 to-red-800', icon: 'netflix', active: 1, sortOrder: 1 },
    // sản phẩm "lịch sử" (inactive) — cho analytics category/top products đa dạng
    { id: 'PRD-SPOTIFY', name: 'Spotify Premium 3 tháng', description: 'Nghe nhạc không quảng cáo, tải xuống offline.', price: 59_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-green-500 to-green-700', icon: 'music', active: 0, sortOrder: 2 },
    { id: 'PRD-CANVA', name: 'Canva Pro 1 năm', description: 'Thiết kế đồ họa chuyên nghiệp.', price: 120_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-cyan-500 to-blue-600', icon: 'palette', active: 0, sortOrder: 3 },
    { id: 'PRD-CHATGPT', name: 'ChatGPT Plus 1 tháng', description: 'Trợ lý AI nâng cao.', price: 250_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-emerald-500 to-teal-600', icon: 'bot', active: 0, sortOrder: 4 },
    { id: 'PRD-YOUTUBE', name: 'YouTube Premium 3 tháng', description: 'Xem không quảng cáo + YT Music.', price: 90_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-red-500 to-rose-600', icon: 'video', active: 0, sortOrder: 5 },
  ];
  PRODUCTS.forEach((p) => insertProduct.run(p));

  // ---- Orders ----
  const insertOrder = db.prepare(
    'INSERT INTO orders (id, email, items, total, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  );
  // Đơn THẬT của admin (mua qua flow mua hàng) — khớp bookedSlots 12
  const adminRealOrders = [
    [1, 'Hoàn thành'], [1, 'Hoàn thành'], [2, 'Hoàn thành'], [1, 'Hoàn thành'],
    [1, 'Đang xử lý'], [1, 'Đang xử lý'], [3, 'Đang xử lý'], [2, 'Đang xử lý'],
  ];
  adminRealOrders.forEach(([qty, status], i) => {
    const total = 20_000 * qty;
    insertOrder.run(
      `ORD-${(100000 + i * 7777).toString().slice(-6)}`,
      'admin@luongkun.io',
      JSON.stringify([{ productId: 'PRD-NETFLIX', name: 'Netflix Trial 30 days', quantity: qty, price: 20_000 }]),
      total, status, now - (adminRealOrders.length - i) * 3600_000 * 5
    );
  });

  // Đơn seed demo (~8000) trải 12 tháng — analytics
  const catalog = [
    ['PRD-NETFLIX', 'Netflix Trial 30 days', 20_000, 'Giải trí'],
    ['PRD-SPOTIFY', 'Spotify Premium 3 tháng', 59_000, 'Giải trí'],
    ['PRD-CANVA', 'Canva Pro 1 năm', 120_000, 'Thiết kế'],
    ['PRD-CHATGPT', 'ChatGPT Plus 1 tháng', 250_000, 'AI & Công cụ'],
    ['PRD-YOUTUBE', 'YouTube Premium 3 tháng', 90_000, 'Giải trí'],
  ];
  const statuses = ['Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Đang xử lý', 'Đang xử lý', 'Đã hủy'];
  const rng = mulberry32(20260906);
  const seedTx = db.transaction(() => {
    for (let i = 0; i < 8000; i++) {
      const [pid, pname, pprice] = catalog[Math.floor(rng() * catalog.length)];
      const qty = 1 + Math.floor(rng() * 3);
      const user = demoUsers[Math.floor(rng() * demoUsers.length)];
      // phân bố thời gian: 12 tháng gần đây (tháng gần nhiều hơn)
      const daysAgo = Math.floor(Math.pow(rng(), 1.4) * 360);
      const status = statuses[Math.floor(rng() * statuses.length)];
      insertOrder.run(
        `ORD-S${String(100000 + i)}`,
        user[0],
        JSON.stringify([{ productId: pid, name: pname, quantity: qty, price: pprice }]),
        pprice * qty,
        status,
        now - daysAgo * DAY
      );
    }
  });
  seedTx();

  console.log('[db] Seed xong: users, transactions, products, orders (8.008 đơn)');
}

/** PRNG deterministic cho seed ổn định */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dùng createRequire để require bcryptjs trong ESM (đã import ở đầu file)

seed();

// ============================================================
//  USERS
// ============================================================
export function nextUserCode() {
  const row = db.prepare('SELECT MAX(userCode) AS m FROM users').get();
  return Math.max(100001, (row?.m ?? 100000) + 1);
}
export function getUserByUserCode(code) {
  return db.prepare('SELECT * FROM users WHERE userCode = ?').get(code);
}
export function getUser(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
}
export function getUsers() {
  return db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all();
}
export function createUser(user) {
  const stmt = db.prepare(`
    INSERT INTO users (email, name, password, role, balance, avatar, userCode, vipOverride, region, source, createdAt)
    VALUES (@email, @name, @password, @role, @balance, @avatar, @userCode, @vipOverride, @region, @source, @createdAt)
  `);
  stmt.run({
    role: 'member', balance: 0, avatar: null, vipOverride: null, region: 'Miền Nam', source: 'organic',
    createdAt: Date.now(),
    ...user,
  });
}
export function updateUser(email, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE users SET ${setClause} WHERE email = @__email`).run({ ...fields, __email: String(email).toLowerCase() });
}
export function deleteUser(email) {
  const e = String(email).toLowerCase();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM orders WHERE email = ?').run(e);
    db.prepare('DELETE FROM transactions WHERE email = ?').run(e);
    db.prepare('DELETE FROM purchases WHERE email = ?').run(e);
    db.prepare('DELETE FROM chat_messages WHERE email = ?').run(e);
    db.prepare('DELETE FROM payment_requests WHERE email = ?').run(e);
    db.prepare('DELETE FROM users WHERE email = ?').run(e);
  });
  tx();
}
export function renameUserEmail(oldEmail, newEmail) {
  const tx = db.transaction(() => {
    for (const t of ['users', 'orders', 'transactions', 'purchases', 'chat_messages', 'payment_requests']) {
      db.prepare(`UPDATE ${t} SET email = ? WHERE email = ?`).run(newEmail, oldEmail);
    }
  });
  tx();
}

// ============================================================
//  PURCHASES (upgrades)
// ============================================================
export function getPurchases(email) {
  return db.prepare('SELECT upgradeId FROM purchases WHERE email = ?').all(email).map((r) => r.upgradeId);
}
export function addPurchase(email, upgradeId) {
  db.prepare('INSERT OR IGNORE INTO purchases (email, upgradeId) VALUES (?, ?)').run(email, upgradeId);
}

// ============================================================
//  PRODUCTS — slot tracking server-side
// ============================================================
export function listProducts() {
  return db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sortOrder, id').all();
}
export function getProductById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}
export function bookSlots(productId, quantity) {
  return db.prepare('UPDATE products SET bookedSlots = MIN(bookedSlots + ?, totalSlots) WHERE id = ?').run(quantity, productId);
}

// ============================================================
//  ORDERS
// ============================================================
export function getOrders(email) {
  return db.prepare('SELECT * FROM orders WHERE email = ? ORDER BY timestamp DESC').all(email);
}
export function createOrder(order) {
  db.prepare(
    'INSERT INTO orders (id, email, items, total, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(order.id, order.email, JSON.stringify(order.items), order.total, order.status || 'Đang xử lý', order.timestamp);
}
export function updateOrderStatus(id, status) {
  return db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
}
export function getOrder(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}
export function countOrdersReal() {
  return db.prepare("SELECT COUNT(*) AS n FROM orders WHERE id NOT LIKE 'ORD-S%'").get().n;
}

// ============================================================
//  TRANSACTIONS
// ============================================================
export function createTransaction(tx) {
  db.prepare(
    'INSERT INTO transactions (id, email, type, amount, bonus, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(tx.id, tx.email, tx.type, tx.amount, tx.bonus || 0, tx.timestamp);
}
export function getTotalTopup(email) {
  return db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE email = ? AND type IN ('topup', 'admin_topup')"
  ).get(email).total;
}
export function getTransactions(email) {
  return db.prepare('SELECT * FROM transactions WHERE email = ? ORDER BY timestamp DESC').all(email);
}

// ============================================================
//  PAYMENTS
// ============================================================
export function createPaymentRequest(p) {
  db.prepare(`
    INSERT INTO payment_requests (id, email, content, amount, status, result, providerRef, createdAt, expiresAt)
    VALUES (?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)
  `).run(p.id, p.email, p.content, p.amount, p.createdAt, p.expiresAt);
}
export function getPaymentRequest(id) {
  return db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(id);
}
export function markPaymentPaid(id, result, providerRef) {
  db.prepare(
    'UPDATE payment_requests SET status = ?, result = ?, providerRef = ?, paidAt = ? WHERE id = ? AND status = ?'
  ).run('paid', JSON.stringify(result), providerRef, Date.now(), id, 'pending');
}
export function expireStalePayments() {
  db.prepare(
    "UPDATE payment_requests SET status = 'expired' WHERE status = 'pending' AND expiresAt < ?"
  ).run(Date.now());
}
export function listPayments(limit = 25) {
  return db.prepare('SELECT * FROM payment_requests ORDER BY createdAt DESC LIMIT ?').all(limit);
}
export function findPendingPaymentByContent(content) {
  return db.prepare("SELECT * FROM payment_requests WHERE status = 'pending' AND content = ? ORDER BY createdAt DESC").get(content);
}

// ============================================================
//  SETTINGS + WEBHOOK LOGS
// ============================================================
export function getSetting(key) {
  return db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key)?.value ?? null;
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
export function addWebhookLog(entry) {
  db.prepare(
    'INSERT INTO webhook_logs (ts, ip, provider, ok, reason, content, amount) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(entry.ts, entry.ip, entry.provider, entry.ok ? 1 : 0, entry.reason, entry.content, entry.amount);
}
export function getWebhookLogs(limit = 50) {
  return db.prepare('SELECT * FROM webhook_logs ORDER BY ts DESC LIMIT ?').all(limit);
}

// ============================================================
//  CHAT
// ============================================================
export function getChatMessages(email, sessionId) {
  return db.prepare(
    'SELECT role, content, createdAt FROM chat_messages WHERE email = ? AND sessionId = ? ORDER BY id ASC LIMIT 200'
  ).all(email, sessionId);
}
export function addChatMessage(email, sessionId, role, content) {
  db.prepare(
    'INSERT INTO chat_messages (email, sessionId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(email, sessionId, role, content, Date.now());
}
export function clearChatMessages(email, sessionId) {
  db.prepare('DELETE FROM chat_messages WHERE email = ? AND sessionId = ?').run(email, sessionId);
}

export default db;
