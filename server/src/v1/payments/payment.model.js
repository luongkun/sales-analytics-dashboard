/**
 * payment.model.js — Model truy cập SQLite (bảng riêng cho API v1)
 *
 * Bảng:
 *  - payment_orders : đơn thanh toán QR (code NAPxxxx là khoá chính, PENDING/COMPLETED/EXPIRED)
 *  - webhook_events : mọi webhook nhận được — KHOÁ CHÍNH `id` chính là cơ chế
 *                     IDEMPOTENT (webhook trùng → INSERT OR IGNORE bỏ qua → không cộng 2 lần)
 */
import db from '../../db.js';

// Khởi tạo bảng (idempotent — chạy an toàn khi restart)
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_orders (
    code TEXT PRIMARY KEY,          -- mã giao dịch duy nhất, ví dụ NAP7K2M9X
    email TEXT NOT NULL,            -- chủ đơn
    amount INTEGER NOT NULL,        -- số tiền (VND, không có phần thập phân)
    description TEXT,               -- mô tả người dùng nhập
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED | EXPIRED
    result TEXT,                    -- JSON kết quả cộng tiền (balance/bonus/vipBonus...)
    webhookEventId TEXT,            -- webhook nào đã hoàn tất đơn (truy vết)
    paidAt INTEGER,
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_payment_orders_email ON payment_orders(email, createdAt);

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,            -- X-Webhook-Id do bên gửi cấp — dedupe key
    provider TEXT,                  -- casso | sepay | simulate | custom...
    orderCode TEXT,
    amount INTEGER,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'RECEIVED', -- RECEIVED | PROCESSED | DUPLICATE | REJECTED
    reason TEXT,                    -- lý do từ chối (nếu có)
    rawBody TEXT,                   -- lưu lại body gốc để điều tra/đối chiếu
    receivedAt INTEGER NOT NULL
  );
`);

// ============ PAYMENT ORDERS ============

/** Tạo đơn mới — trả về true nếu chèn thành công (false = trùng code) */
export function insertPaymentOrder(order) {
  const r = db
    .prepare(
      `INSERT OR IGNORE INTO payment_orders (code, email, amount, description, status, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`
    )
    .run(order.code, order.email, order.amount, order.description ?? null, order.createdAt, order.expiresAt);
  return r.changes > 0;
}

export function getPaymentOrderByCode(code) {
  return db.prepare('SELECT * FROM payment_orders WHERE code = ?').get(code);
}

/** Danh sách đơn: theo email, hoặc toàn bộ nếu all=true (admin) */
export function listPaymentOrders({ email = null, all = false, limit = 20 }) {
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  if (all) {
    const rows = db.prepare('SELECT * FROM payment_orders ORDER BY createdAt DESC LIMIT ?').all(lim);
    const total = db.prepare('SELECT COUNT(*) AS n FROM payment_orders').get().n;
    return { rows, total };
  }
  const rows = db
    .prepare('SELECT * FROM payment_orders WHERE email = ? ORDER BY createdAt DESC LIMIT ?')
    .all(email, lim);
  const total = db.prepare('SELECT COUNT(*) AS n FROM payment_orders WHERE email = ?').get(email).n;
  return { rows, total };
}

/** Chuyển PENDING → EXPIRED cho các đơn quá hạn (lazy expiry, chạy khi tạo/tra cứu) */
export function expireStalePaymentOrders() {
  db.prepare("UPDATE payment_orders SET status = 'EXPIRED' WHERE status = 'PENDING' AND expiresAt < ?").run(Date.now());
}

/**
 * Hoàn tất đơn — UPDATE ATOMIC chỉ khi vẫn PENDING.
 * Trả về false nếu đơn đã COMPLETED/EXPIRED → chặn cộng tiền 2 lần (idempotent lớp 2).
 */
export function completePaymentOrder(code, webhookEventId, result) {
  const r = db
    .prepare(
      `UPDATE payment_orders
       SET status = 'COMPLETED', paidAt = ?, webhookEventId = ?, result = ?
       WHERE code = ? AND status = 'PENDING'`
    )
    .run(Date.now(), webhookEventId, result ? JSON.stringify(result) : null, code);
  return r.changes > 0;
}

// ============ WEBHOOK EVENTS (idempotency) ============

/** Ghi nhận webhook — false = ID đã tồn tại (webhook trùng, bỏ qua không xử lý) */
export function insertWebhookEvent(evt) {
  const r = db
    .prepare(
      `INSERT OR IGNORE INTO webhook_events (id, provider, amount, content, status, rawBody, receivedAt)
       VALUES (?, ?, ?, ?, 'RECEIVED', ?, ?)`
    )
    .run(evt.id, evt.provider ?? null, evt.amount ?? null, evt.content ?? null, evt.rawBody ?? null, evt.receivedAt);
  return r.changes > 0;
}

/** Cập nhật trạng thái xử lý của webhook (PROCESS/REJECT đều ghi lại để truy vết) */
export function updateWebhookEvent(id, { status, reason, orderCode }) {
  db.prepare('UPDATE webhook_events SET status = ?, reason = ?, orderCode = ? WHERE id = ?').run(
    status,
    reason ?? null,
    orderCode ?? null,
    id
  );
}

export function getWebhookEvent(id) {
  return db.prepare('SELECT * FROM webhook_events WHERE id = ?').get(id);
}

/** Lấy eventId PROCESSED cuối cùng của 1 đơn — dùng cho nút "gửi trùng webhook" */
export function getLastProcessedWebhookEvent(orderCode) {
  return db
    .prepare(
      "SELECT * FROM webhook_events WHERE orderCode = ? AND status = 'PROCESSED' ORDER BY receivedAt DESC LIMIT 1"
    )
    .get(orderCode);
}
