import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'app.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT,
    password TEXT,
    role TEXT DEFAULT 'member',
    balance INTEGER DEFAULT 0,
    avatar TEXT,
    googleOnly INTEGER DEFAULT 0,
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
    role TEXT NOT NULL, -- 'user' | 'assistant'
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (email) REFERENCES users(email)
  );
  CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(email, sessionId, id);

  -- Yêu cầu thanh toán VietQR động: mỗi lần user bấm "Thanh toán" sinh 1 mã
  -- nội dung chuyển khoản DUY NHẤT (VD NAP482913) — dùng để đối soát webhook
  CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    content TEXT NOT NULL UNIQUE, -- nội dung CK duy nhất (NAP + 6 số)
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending | paid | expired
    result TEXT,                    -- JSON kết quả cộng tiền (bonus, balance, tierUp…)
    createdAt INTEGER,
    expiresAt INTEGER,
    paidAt INTEGER,
    FOREIGN KEY (email) REFERENCES users(email)
  );
  CREATE INDEX IF NOT EXISTS idx_payment_email ON payment_requests(email, createdAt);
`);

// ----- Migration nhẹ (idempotent): thêm cột mới cho DB cũ -----
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
ensureColumn('users', 'region', 'region TEXT');
ensureColumn('users', 'source', 'source TEXT');
ensureColumn('users', 'vipOverride', 'vipOverride INTEGER'); // null = tự động theo tổng nạp, 0 = không VIP, 1-4 = hạng cố định
ensureColumn('orders', 'status', "status TEXT DEFAULT 'Hoàn thành'");

export function getUser(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

export function getUsers() {
  const stmt = db.prepare('SELECT * FROM users');
  return stmt.all();
}

export function createUser(user) {
  const stmt = db.prepare(
    'INSERT INTO users (email, name, password, role, balance, avatar, googleOnly, region, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    user.email,
    user.name,
    user.password || null,
    user.role || 'member',
    user.balance || 0,
    user.avatar || null,
    user.googleOnly ? 1 : 0,
    user.region || null,
    user.source || null,
    user.createdAt || Date.now()
  );
}

export function updateUser(email, fields) {
  const allowed = ['name', 'password', 'role', 'balance', 'avatar', 'googleOnly', 'region', 'source', 'vipOverride'];
  const setClause = allowed
    .filter((f) => f in fields)
    .map((f) => `${f} = ?`)
    .join(', ');
  if (!setClause) return;
  const values = allowed.filter((f) => f in fields).map((f) => fields[f]);
  values.push(email);
  const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE email = ?`);
  stmt.run(...values);
}

export function getPurchases(email) {
  const stmt = db.prepare('SELECT upgradeId FROM purchases WHERE email = ?');
  return stmt.all(email).map((row) => row.upgradeId);
}

export function addPurchase(email, upgradeId) {
  const stmt = db.prepare('INSERT OR IGNORE INTO purchases (email, upgradeId) VALUES (?, ?)');
  stmt.run(email, upgradeId);
}

export function getOrders(email) {
  const stmt = db.prepare('SELECT * FROM orders WHERE email = ? ORDER BY timestamp DESC');
  return stmt.all(email);
}

export function createOrder(order) {
  // Đơn mới luôn "Đang xử lý" — shop chưa gửi thông tin tài khoản/slot cho khách
  const stmt = db.prepare(
    "INSERT INTO orders (id, email, items, total, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt.run(order.id, order.email, JSON.stringify(order.items), order.total, order.status || 'Đang xử lý', order.timestamp);
}

/** Admin cập nhật trạng thái đơn (VD đã gửi dữ liệu → 'Hoàn thành') */
export function updateOrderStatus(id, status) {
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  return stmt.run(status, id);
}

/** Lấy 1 đơn bất kỳ (admin) */
export function getOrder(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

export function createTransaction(tx) {
  const stmt = db.prepare(
    'INSERT INTO transactions (id, email, type, amount, bonus, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(tx.id, tx.email, tx.type, tx.amount, tx.bonus || 0, tx.timestamp);
}

export function getTotalTopup(email) {
  // 'admin_topup' = admin cộng tiền tay — cũng tính vào tổng nạp (VIP)
  const stmt = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE email = ? AND type IN ('topup', 'admin_topup')"
  );
  return stmt.get(email).total;
}

export function getTransactions(email) {
  const stmt = db.prepare('SELECT * FROM transactions WHERE email = ? ORDER BY timestamp DESC');
  return stmt.all(email);
}

// ============================================================
//  CHAT AI — lịch sử hội thoại bền vững (lưu DB)
// ============================================================
const CHAT_HISTORY_LIMIT = 200; // giữ tối đa 200 tin / phiên (chống phình DB)

/** Lịch sử hội thoại của 1 phiên (user) */
export function getChatMessages(email, sessionId) {
  return db
    .prepare(
      'SELECT role, content, createdAt FROM chat_messages WHERE email = ? AND sessionId = ? ORDER BY id ASC'
    )
    .all(email, sessionId);
}

/** Thêm 1 tin nhắn vào lịch sử + tự prune vượt giới hạn */
export function addChatMessage(email, sessionId, role, content) {
  db.prepare(
    'INSERT INTO chat_messages (email, sessionId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(email, sessionId, role, content, Date.now());
  // Prune: xóa tin cũ nhất nếu vượt giới hạn
  db.prepare(
    `DELETE FROM chat_messages WHERE id IN (
       SELECT id FROM chat_messages WHERE email = ? AND sessionId = ? ORDER BY id DESC LIMIT -1 OFFSET ?
     )`
  ).run(email, sessionId, CHAT_HISTORY_LIMIT);
}

/** Xóa toàn bộ lịch sử 1 phiên */
export function clearChatMessages(email, sessionId) {
  db.prepare('DELETE FROM chat_messages WHERE email = ? AND sessionId = ?').run(email, sessionId);
}

// ============================================================
//  PAYMENT REQUESTS (VietQR động — đối soát webhook)
// ============================================================

/** Chèn yêu cầu thanh toán — trả về false nếu trùng content (bên gọi sinh lại) */
export function insertPaymentRequest(row) {
  try {
    db.prepare(
      'INSERT INTO payment_requests (id, email, content, amount, status, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(row.id, row.email, row.content, row.amount, 'pending', row.createdAt, row.expiresAt);
    return true;
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) return false; // trùng content → sinh mã khác
    throw err;
  }
}

export function getPaymentRequest(id) {
  return db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(id);
}

export function getPaymentRequestByContent(content) {
  return db
    .prepare('SELECT * FROM payment_requests WHERE content = ? COLLATE NOCASE')
    .get(String(content || '').trim().toUpperCase());
}

/** Cập nhật trạng thái (kèm result JSON khi paid) */
export function setPaymentStatus(id, status, result) {
  db.prepare(
    "UPDATE payment_requests SET status = ?, result = ?, paidAt = CASE WHEN ? = 'paid' THEN ? ELSE paidAt END WHERE id = ?"
  ).run(status, result ? JSON.stringify(result) : null, status, Date.now(), id);
}

/** Các yêu cầu pending đã quá hạn → chuyển expired (gọi lười khi poll) */
export function expireStalePayments() {
  db.prepare("UPDATE payment_requests SET status = 'expired' WHERE status = 'pending' AND expiresAt < ?").run(
    Date.now()
  );
}

export default db;