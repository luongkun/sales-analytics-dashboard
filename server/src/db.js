/**
 * db.js v2 (Task 79) — libSQL client cho Sales Analytics Dashboard
 *
 * 💡 Kiến trúc "một code path, hai môi trường":
 *   - Sandbox/dev:   url mặc định file:./src/data/app.db (SQLite local — không cần cấu hình)
 *   - Render/prod:   env LIBSQL_URL=libsql://<db>.<org>.turso.io + LIBSQL_AUTH_TOKEN
 *                    → DB thật trên Turso cloud → REDepLOY KHÔNG CÒN RESET DỮ LIỆU
 *
 * Toàn bộ hàm export giờ là ASYNC — caller (routes/helpers) phải await.
 * Hàm tiền tệ dùng SQL nguyên tử (RETURNING) — an toàn race-condition khi async.
 */
import { createClient } from '@libsql/client';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'app.db');

const DB_URL = process.env.LIBSQL_URL || `file:${DB_PATH}`;
export const db = createClient({
  url: DB_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
});
console.log(`[db] libSQL → ${DB_URL.startsWith('file:') ? DB_URL : DB_URL.replace(/(libsql:\/\/[^/]+).*/, '$1 (Turso cloud)')}`);

// ---------- helper truy vấn gọn ----------
export async function q(sql, args = []) { return (await db.execute({ sql, args })).rows; }
export async function qGet(sql, args = []) { return (await db.execute({ sql, args })).rows[0] ?? null; }

// ============================================================
//  SCHEMA (idempotent)
// ============================================================
await db.executeMultiple(`
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

  CREATE TABLE IF NOT EXISTS notification_state (
    email TEXT NOT NULL,
    nid TEXT NOT NULL,
    flag TEXT NOT NULL,
    ts INTEGER NOT NULL,
    PRIMARY KEY (email, nid)
  );

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
async function ensureColumn(table, column, ddl) {
  const cols = (await q(`SELECT name FROM pragma_table_info('${table}')`)).map((c) => c.name);
  if (!cols.includes(column)) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
await ensureColumn('users', 'region', 'region TEXT');
await ensureColumn('users', 'source', 'source TEXT');
await ensureColumn('users', 'vipOverride', 'vipOverride INTEGER');
await ensureColumn('users', 'userCode', 'userCode INTEGER');

// ============================================================
//  SEED — chỉ chạy lần đầu (bảng users rỗng)
// ============================================================
async function seed() {
  const userCount = (await qGet('SELECT COUNT(*) AS n FROM users')).n;
  if (userCount > 0) return;
  console.log('[db] Seed dữ liệu ban đầu...');

  const now = Date.now();
  const DAY = 86_400_000;

  // ---- Webhook secret ----
  const secret = crypto.randomBytes(16).toString('hex');
  await db.execute({ sql: 'INSERT INTO app_settings (key, value) VALUES (?, ?)', args: ['webhook_secret', secret] });
  await db.execute({ sql: 'INSERT INTO app_settings (key, value) VALUES (?, ?)', args: ['webhook_secret_created', String(now)] });
  console.log('[db] Webhook secret mới:', secret);

  // ---- Users ----
  const insertUserSql = `
    INSERT INTO users (email, name, password, role, balance, avatar, userCode, vipOverride, region, source, createdAt)
    VALUES (@email, @name, @password, @role, @balance, @avatar, @userCode, @vipOverride, @region, @source, @createdAt)
  `;
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Admin chính
  await db.execute({ sql: insertUserSql, args: {
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
  } });

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
  for (let i = 0; i < demoUsers.length; i++) {
    const [email, name, balance, , region] = demoUsers[i];
    await db.execute({ sql: insertUserSql, args: {
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
    } });
  }

  // ---- Transactions (topup demo — để totalTopup/VIP đúng) ----
  const txBatch = [];
  let txSeq = 1;
  const addTopups = (email, total, parts) => {
    let remain = total;
    for (let i = 0; i < parts; i++) {
      const isLast = i === parts - 1;
      const amt = isLast ? remain : Math.floor(total / parts / 10000) * 10000;
      remain -= amt;
      if (amt <= 0) continue;
      txBatch.push({ sql: 'INSERT INTO transactions (id, email, type, amount, bonus, timestamp) VALUES (?, ?, ?, ?, ?, ?)', args: [`TX-${now}-${txSeq++}`, email, 'topup', amt, Math.floor(amt * 0.1), now - (60 - i * 10) * DAY] });
    }
  };
  addTopups('admin@luongkun.io', 5_621_499, 5);
  demoUsers.forEach(([email, , , topup]) => addTopups(email, topup, 2));

  // ---- Products ----
  const insertProductSql = `
    INSERT INTO products (id, name, description, price, totalSlots, bookedSlots, gradient, icon, active, sortOrder)
    VALUES (@id, @name, @description, @price, @totalSlots, @bookedSlots, @gradient, @icon, @active, @sortOrder)
  `;
  const PRODUCTS = [
    { id: 'PRD-NETFLIX', name: 'Netflix Trial 30 days', description: 'Dùng thử Netflix Premium trọn 30 ngày — 4K Ultra HD, xem trên 4 thiết bị, hủy bất cứ lúc nào.', price: 20_000, totalSlots: 100, bookedSlots: 12, gradient: 'from-red-600 to-red-800', icon: 'netflix', active: 1, sortOrder: 1 },
    // sản phẩm "lịch sử" (inactive) — cho analytics category/top products đa dạng
    { id: 'PRD-SPOTIFY', name: 'Spotify Premium 3 tháng', description: 'Nghe nhạc không quảng cáo, tải xuống offline.', price: 59_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-green-500 to-green-700', icon: 'music', active: 0, sortOrder: 2 },
    { id: 'PRD-CANVA', name: 'Canva Pro 1 năm', description: 'Thiết kế đồ họa chuyên nghiệp.', price: 120_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-cyan-500 to-blue-600', icon: 'palette', active: 0, sortOrder: 3 },
    { id: 'PRD-CHATGPT', name: 'ChatGPT Plus 1 tháng', description: 'Trợ lý AI nâng cao.', price: 250_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-emerald-500 to-teal-600', icon: 'bot', active: 0, sortOrder: 4 },
    { id: 'PRD-YOUTUBE', name: 'YouTube Premium 3 tháng', description: 'Xem không quảng cáo + YT Music.', price: 90_000, totalSlots: 0, bookedSlots: 0, gradient: 'from-red-500 to-rose-600', icon: 'video', active: 0, sortOrder: 5 },
  ];
  for (const p of PRODUCTS) await db.execute({ sql: insertProductSql, args: p });

  // ---- Orders ----  // Đơn THẬT của admin (mua qua flow mua hàng) — khớp bookedSlots 12
  const adminRealOrders = [
    [1, 'Hoàn thành'], [1, 'Hoàn thành'], [2, 'Hoàn thành'], [1, 'Hoàn thành'],
    [1, 'Đang xử lý'], [1, 'Đang xử lý'], [3, 'Đang xử lý'], [2, 'Đang xử lý'],
  ];
  for (let i = 0; i < adminRealOrders.length; i++) {
    const [qty, status] = adminRealOrders[i];
    await db.execute({
      sql: 'INSERT INTO orders (id, email, items, total, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        `ORD-${(100000 + i * 7777).toString().slice(-6)}`,
        'admin@luongkun.io',
        JSON.stringify([{ productId: 'PRD-NETFLIX', name: 'Netflix Trial 30 days', quantity: qty, price: 20_000 }]),
        20_000 * qty, status, now - (adminRealOrders.length - i) * 3600_000 * 5,
      ],
    });
  }

  // Đơn seed demo (~8000) trải 12 tháng — analytics (batch 1000 lệnh / 1 transaction)
  const catalog = [
    ['PRD-NETFLIX', 'Netflix Trial 30 days', 20_000],
    ['PRD-SPOTIFY', 'Spotify Premium 3 tháng', 59_000],
    ['PRD-CANVA', 'Canva Pro 1 năm', 120_000],
    ['PRD-CHATGPT', 'ChatGPT Plus 1 tháng', 250_000],
    ['PRD-YOUTUBE', 'YouTube Premium 3 tháng', 90_000],
  ];
  const statuses = ['Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Hoàn thành', 'Đang xử lý', 'Đang xử lý', 'Đã hủy'];
  const rng = mulberry32(20260906);
  const orderSql = 'INSERT INTO orders (id, email, items, total, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)';
  let buf = [];
  for (let i = 0; i < 8000; i++) {
    const [pid, pname, pprice] = catalog[Math.floor(rng() * catalog.length)];
    const qty = 1 + Math.floor(rng() * 3);
    const user = demoUsers[Math.floor(rng() * demoUsers.length)];
    const daysAgo = Math.floor(Math.pow(rng(), 1.4) * 360);
    const status = statuses[Math.floor(rng() * statuses.length)];
    buf.push({ sql: orderSql, args: [
      `ORD-S${String(100000 + i)}`,
      user[0],
      JSON.stringify([{ productId: pid, name: pname, quantity: qty, price: pprice }]),
      pprice * qty,
      status,
      now - daysAgo * DAY,
    ] });
    if (buf.length >= 1000) { await db.batch(buf, 'write'); buf = []; }
  }
  if (buf.length) await db.batch(buf, 'write');
  await db.batch(txBatch, 'write');

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

await seed();

// ============================================================
//  USERS
// ============================================================
export async function nextUserCode() {
  const row = await qGet('SELECT MAX(userCode) AS m FROM users');
  return Math.max(100001, (row?.m ?? 100000) + 1);
}
export async function getUserByUserCode(code) {
  return qGet('SELECT * FROM users WHERE userCode = ?', [code]);
}
export async function getUser(email) {
  return qGet('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]);
}
export async function getUsers() {
  return q('SELECT * FROM users ORDER BY createdAt ASC');
}
export async function createUser(user) {
  await db.execute({
    sql: `
      INSERT INTO users (email, name, password, role, balance, avatar, userCode, vipOverride, region, source, createdAt)
      VALUES (@email, @name, @password, @role, @balance, @avatar, @userCode, @vipOverride, @region, @source, @createdAt)
    `,
    args: {
      role: 'member', balance: 0, avatar: null, vipOverride: null, region: 'Miền Nam', source: 'organic',
      createdAt: Date.now(),
      ...user,
    },
  });
}
export async function updateUser(email, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
  await db.execute({ sql: `UPDATE users SET ${setClause} WHERE email = @__email`, args: { ...fields, __email: String(email).toLowerCase() } });
}
/** Cộng/trừ số dư NGUYÊN TỬ (an toàn race-condition async) — trả balance mới, null nếu user không tồn tại */
export async function adjustBalance(email, delta) {
  const rows = await q('UPDATE users SET balance = balance + ? WHERE email = ? RETURNING balance', [Math.floor(delta), String(email).toLowerCase()]);
  return rows[0]?.balance ?? null;
}
/** Trừ tiền NGUYÊN TỬ có điều kiện — trả balance mới, null nếu KHÔNG ĐỦ tiền / không tồn tại */
export async function debitBalance(email, amount) {
  const rows = await q('UPDATE users SET balance = balance - ? WHERE email = ? AND balance >= ? RETURNING balance', [amount, String(email).toLowerCase(), amount]);
  return rows[0]?.balance ?? null;
}
export async function deleteUser(email) {
  const e = String(email).toLowerCase();
  await db.batch([
    { sql: 'DELETE FROM orders WHERE email = ?', args: [e] },
    { sql: 'DELETE FROM transactions WHERE email = ?', args: [e] },
    { sql: 'DELETE FROM purchases WHERE email = ?', args: [e] },
    { sql: 'DELETE FROM chat_messages WHERE email = ?', args: [e] },
    { sql: 'DELETE FROM payment_requests WHERE email = ?', args: [e] },
    { sql: 'DELETE FROM users WHERE email = ?', args: [e] },
  ], 'write');
}
export async function renameUserEmail(oldEmail, newEmail) {
  const stmts = [];
  for (const t of ['users', 'orders', 'transactions', 'purchases', 'chat_messages', 'payment_requests']) {
    stmts.push({ sql: `UPDATE ${t} SET email = ? WHERE email = ?`, args: [newEmail, oldEmail] });
  }
  await db.batch(stmts, 'write');
}

// ============================================================
//  PURCHASES (upgrades)
// ============================================================
export async function getPurchases(email) {
  return (await q('SELECT upgradeId FROM purchases WHERE email = ?', [email])).map((r) => r.upgradeId);
}
export async function addPurchase(email, upgradeId) {
  await db.execute({ sql: 'INSERT OR IGNORE INTO purchases (email, upgradeId) VALUES (?, ?)', args: [email, upgradeId] });
}

// ============================================================
//  PRODUCTS — slot tracking server-side
// ============================================================
export async function listProducts() {
  return q('SELECT * FROM products WHERE active = 1 ORDER BY sortOrder, id');
}
export async function getProductById(id) {
  return qGet('SELECT * FROM products WHERE id = ?', [id]);
}
export async function bookSlots(productId, quantity) {
  await db.execute({ sql: 'UPDATE products SET bookedSlots = MIN(bookedSlots + ?, totalSlots) WHERE id = ?', args: [quantity, productId] });
}

// ============================================================
//  ORDERS
// ============================================================
export async function getOrders(email) {
  return q('SELECT * FROM orders WHERE email = ? ORDER BY timestamp DESC', [email]);
}
export async function createOrder(order) {
  await db.execute({
    sql: 'INSERT INTO orders (id, email, items, total, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    args: [order.id, order.email, JSON.stringify(order.items), order.total, order.status || 'Đang xử lý', order.timestamp],
  });
}
export async function updateOrderStatus(id, status) {
  await db.execute({ sql: 'UPDATE orders SET status = ? WHERE id = ?', args: [status, id] });
}
export async function getOrder(id) {
  return qGet('SELECT * FROM orders WHERE id = ?', [id]);
}
export async function countOrdersReal() {
  return (await qGet("SELECT COUNT(*) AS n FROM orders WHERE id NOT LIKE 'ORD-S%'")).n;
}

// ============================================================
//  TRANSACTIONS
// ============================================================
export async function createTransaction(tx) {
  await db.execute({
    sql: 'INSERT INTO transactions (id, email, type, amount, bonus, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    args: [tx.id, tx.email, tx.type, tx.amount, tx.bonus || 0, tx.timestamp],
  });
}
export async function getTotalTopup(email) {
  return (await qGet("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE email = ? AND type IN ('topup', 'admin_topup')", [email])).total;
}
export async function getTransactions(email) {
  return q('SELECT * FROM transactions WHERE email = ? ORDER BY timestamp DESC', [email]);
}

// ============================================================
//  PAYMENTS
// ============================================================
export async function createPaymentRequest(p) {
  await db.execute({
    sql: `
      INSERT INTO payment_requests (id, email, content, amount, status, result, providerRef, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)
    `,
    args: [p.id, p.email, p.content, p.amount, p.createdAt, p.expiresAt],
  });
}
export async function getPaymentRequest(id) {
  return qGet('SELECT * FROM payment_requests WHERE id = ?', [id]);
}
export async function markPaymentPaid(id, result, providerRef) {
  await db.execute({
    sql: 'UPDATE payment_requests SET status = ?, result = ?, providerRef = ?, paidAt = ? WHERE id = ? AND status = ?',
    args: ['paid', JSON.stringify(result), providerRef, Date.now(), id, 'pending'],
  });
}
export async function expireStalePayments() {
  await db.execute({ sql: "UPDATE payment_requests SET status = 'expired' WHERE status = 'pending' AND expiresAt < ?", args: [Date.now()] });
}
export async function listPayments(limit = 25) {
  return q('SELECT * FROM payment_requests ORDER BY createdAt DESC LIMIT ?', [limit]);
}
export async function findPendingPaymentByContent(content) {
  return qGet("SELECT * FROM payment_requests WHERE status = 'pending' AND content = ? ORDER BY createdAt DESC", [content]);
}

// ============================================================
//  SETTINGS + WEBHOOK LOGS
// ============================================================
export async function getSetting(key) {
  return (await qGet('SELECT value FROM app_settings WHERE key = ?', [key]))?.value ?? null;
}
export async function setSetting(key, value) {
  await db.execute({ sql: 'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [key, value] });
}
export async function addWebhookLog(entry) {
  await db.execute({
    sql: 'INSERT INTO webhook_logs (ts, ip, provider, ok, reason, content, amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [entry.ts, entry.ip, entry.provider, entry.ok ? 1 : 0, entry.reason, entry.content, entry.amount],
  });
}
export async function getWebhookLogs(limit = 50) {
  return q('SELECT * FROM webhook_logs ORDER BY ts DESC LIMIT ?', [limit]);
}

// ============================================================
//  CHAT
// ============================================================
export async function getChatMessages(email, sessionId) {
  return q('SELECT role, content, createdAt FROM chat_messages WHERE email = ? AND sessionId = ? ORDER BY id ASC LIMIT 200', [email, sessionId]);
}
export async function addChatMessage(email, sessionId, role, content) {
  await db.execute({
    sql: 'INSERT INTO chat_messages (email, sessionId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)',
    args: [email, sessionId, role, content, Date.now()],
  });
}
export async function clearChatMessages(email, sessionId) {
  await db.execute({ sql: 'DELETE FROM chat_messages WHERE email = ? AND sessionId = ?', args: [email, sessionId] });
}

export default db;
