/**
 * payment.service.js — SERVICE: toàn bộ nghiệp vụ thanh toán QR động
 *
 * Luồng (đúng theo spec):
 *  1) createPaymentOrder  : sinh NAP_ID duy nhất + PENDING + TTL + URL QR VietQR động
 *  2) processWebhook      : verify HMAC → dedupe (idempotent) → parse NAP_ID → khớp tiền
 *                           → COMPLETE + cộng tiền vào ví → broadcast realtime
 *  3) simulateTransfer    : mô phỏng NGÂN HÀNG gọi webhook thật (ký HMAC đúng/tâm sai)
 *                           — dùng để demo & test end-to-end không cần cổng thanh toán thật
 */
import crypto from 'crypto';
import db, { getSetting, addWebhookLog, getUser } from '../../db.js';
import { creditTopup, publicUser } from '../../helpers.js';
import { broadcast } from '../../realtime.js';
import * as model from './payment.model.js';
import {
  BANK,
  buildVietQrImageUrl,
  buildMomoQrUrl,
  buildEmvPayload,
  normalizeTransferContent,
} from './vietqr.helper.js';
import { generateOrderCode, parseTransactionCode } from './code.helper.js';
import { hmacSha256Hex, verifyWebhookSignature } from './signature.helper.js';

// ---------- Hằng số nghiệp vụ ----------
const ORDER_TTL_MS = 15 * 60_000;        // đơn QR sống 15 phút
const AMOUNT_MIN = 10_000;               // 10.000đ
const AMOUNT_MAX = 50_000_000;           // 50 triệu
const MAX_DESCRIPTION = 100;
const LOCAL_PORT = process.env.PORT || 3001;
const WEBHOOK_PATH = '/api/v1/payments/webhook';

// ============================================================
//  1) TẠO ĐƠN HÀNG + QR ĐỘNG
// ============================================================

/** Validate số tiền nạp (nguyên dương, trong ngưỡng cho phép) */
export function validateAmount(amount) {
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < AMOUNT_MIN || amt > AMOUNT_MAX) {
    return { ok: false, error: `Số tiền phải là số nguyên từ ${AMOUNT_MIN.toLocaleString('vi-VN')}đ đến ${AMOUNT_MAX.toLocaleString('vi-VN')}đ` };
  }
  return { ok: true, amt };
}

/** Trả về shape công khai của đơn (kèm QR + bank info cho FE render) */
export function toPublicOrder(o) {
  if (!o) return null;
  const content = normalizeTransferContent(o.code); // nội dung CK chính là mã đơn
  return {
    code: o.code,
    email: o.email,
    amount: o.amount,
    description: o.description ?? null,
    content,
    status: o.status, // PENDING | COMPLETED | EXPIRED
    createdAt: o.createdAt,
    expiresAt: o.expiresAt,
    ttlSeconds: Math.max(0, Math.floor((o.expiresAt - Date.now()) / 1000)),
    paidAt: o.paidAt ?? null,
    bank: {
      name: BANK.name,
      short: BANK.short,
      bin: BANK.bin,
      accountNo: BANK.accountNumber,
      accountName: BANK.accountName,
    },
    qr: {
      // Ảnh QR động theo spec VietQR (amount + addInfo duy nhất)
      url: buildVietQrImageUrl({ amount: o.amount, content }),
      // Payload EMVCo — FE dùng render QR nội bộ khi offline
      emv: buildEmvPayload({ amount: o.amount, content }),
      momoUrl: buildMomoQrUrl({ amount: o.amount, content }),
    },
    credited: o.result ? JSON.parse(o.result) : null,
  };
}

/** Tạo đơn PENDING mới kèm mã NAP_ID duy nhất (thử tối đa 5 lần nếu trùng code) */
export function createPaymentOrder({ email, amount, description }) {
  const v = validateAmount(amount);
  if (!v.ok) return { error: v.error };
  const desc =
    typeof description === 'string' && description.trim() ? description.trim().slice(0, MAX_DESCRIPTION) : null;

  model.expireStalePaymentOrders(); // dọn các đơn treo quá hạn

  for (let attempt = 0; attempt < 5; attempt++) {
    const order = {
      code: generateOrderCode(),
      email,
      amount: v.amt,
      description: desc,
      createdAt: Date.now(),
      expiresAt: Date.now() + ORDER_TTL_MS,
    };
    if (model.insertPaymentOrder(order)) {
      return { order: model.getPaymentOrderByCode(order.code) };
    }
  }
  return { error: 'Không sinh được mã giao dịch duy nhất, thử lại' };
}

/** Tra cứu đơn + lazy-expire. Quyền: chủ đơn hoặc admin. */
export function getPaymentOrderForViewer(code, { email, role }) {
  model.expireStalePaymentOrders();
  const o = model.getPaymentOrderByCode(code);
  if (!o) return { error: 'Không tìm thấy đơn thanh toán', status: 404 };
  if (o.email !== email && role !== 'admin') return { error: 'Không có quyền xem đơn này', status: 403 };
  return { order: o };
}

/** Lịch sử đơn của user (admin xem toàn bộ) */
export function listPaymentOrdersForViewer({ email, role, limit }) {
  model.expireStalePaymentOrders();
  const { rows, total } = model.listPaymentOrders({ email, all: role === 'admin', limit });
  return {
    orders: rows.map((o) => ({
      code: o.code,
      amount: o.amount,
      description: o.description ?? null,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt ?? null,
    })),
    total,
  };
}

// ============================================================
//  2) WEBHOOK RECEIVER (bảo mật + idempotent)
// ============================================================

/**
 * Chuẩn hoá body webhook từ nhiều provider (Casso/SePay/custom) về 1 shape thống nhất.
 * Frontend/gateway gửi: { provider, eventId, transactionId, amount, content, accountNumber, transferredAt }
 */
function normalizeWebhookBody(body) {
  return {
    provider: String(body.provider || body.gateway || 'custom'),
    eventId: body.eventId || body.id || body.referenceCode || body.transactionId || null,
    transactionId: body.transactionId || body.id || null,
    amount: Number(body.amount ?? body.value ?? 0),
    content: String(body.content || body.description || body.message || ''),
    accountNumber: body.accountNumber ? String(body.accountNumber) : null,
    transferredAt: body.transferredAt || null,
  };
}

/**
 * Xử lý webhook chuyển khoản — LUỒNG CHÍNH.
 * Thứ tự kiểm (bảo mật trước, nghiệp vụ sau):
 *   signature → timestamp → dedupe(theo eventId) → parse NAP_ID → đơn tồn tại + PENDING
 *   → đúng tài khoản nhận → khớp số tiền → ATOMIC complete + cộng tiền → realtime.
 * Mọi nhánh đều ghi webhook_events + webhook_logs (admin theo dõi được).
 *
 * @returns {{httpStatus: number, body: object}} — controller chỉ việc res.status(...).json(...)
 */
export function processWebhook({ rawBody, body, headers, ip }) {
  const secret = getSetting('webhook_secret');
  const normalized = normalizeWebhookBody(body || {});
  const provider = normalized.provider;
  const eventId = String(headers['x-webhook-id'] || normalized.eventId || '').trim();
  const amount = normalized.amount;
  const rawContent = normalized.content;
  const log = (ok, reason, content, amt) =>
    addWebhookLog({ ts: Date.now(), ip, provider, ok: ok ? 1 : 0, reason, content: content ?? '', amount: amt ?? amount });

  // ---- (a) Xác thực chữ ký HMAC-SHA256 trên RAW body ----
  const sig = verifyWebhookSignature({
    signature: headers['x-signature'],
    rawBody,
    secret,
    timestamp: headers['x-webhook-timestamp'],
  });
  if (!sig.ok) {
    log(false, `v1 ${sig.error}`, rawContent, amount);
    return { httpStatus: sig.error === 'missing-signature' || sig.error === 'invalid-signature' || sig.error === 'stale-timestamp' ? 401 : 500, body: { ok: false, error: sig.error } };
  }

  // ---- (b) Webhook cần ID duy nhất để dedupe ----
  if (!eventId) {
    log(false, 'v1 missing webhook id', rawContent, amount);
    return { httpStatus: 400, body: { ok: false, error: 'missing webhook id (X-Webhook-Id)' } };
  }

  // ---- (c) IDEMPOTENT: eventId đã xử lý → trả DUPLICATE, KHÔNG cộng tiền lại ----
  if (!model.insertWebhookEvent({ id: eventId, provider, amount, content: rawContent, rawBody: String(rawBody ?? ''), receivedAt: Date.now() })) {
    const prior = model.getWebhookEvent(eventId);
    model.updateWebhookEvent(eventId, { status: 'DUPLICATE', reason: 'duplicate webhook — skipped (idempotent)' });
    log(true, `v1 duplicate ${eventId}`, rawContent, amount);
    return {
      httpStatus: 200,
      body: { ok: true, status: 'DUPLICATE', eventId, message: 'Webhook đã được xử lý trước đó — bỏ qua để tránh cộng tiền 2 lần', priorStatus: prior?.status ?? null },
    };
  }

  // ---- (d) Bóc tách mã giao dịch NAP_ID từ nội dung chuyển khoản ----
  const orderCode = parseTransactionCode(rawContent);
  if (!orderCode) {
    model.updateWebhookEvent(eventId, { status: 'REJECTED', reason: 'no-transaction-code' });
    log(false, 'v1 no NAP code', rawContent, amount);
    return { httpStatus: 200, body: { ok: true, status: 'REJECTED', reason: 'no-transaction-code', message: 'Nội dung chuyển khoản không chứa mã giao dịch NAP' } };
  }

  // ---- (e) Tìm đơn PENDING khớp mã ----
  model.expireStalePaymentOrders();
  const order = model.getPaymentOrderByCode(orderCode);
  if (!order) {
    model.updateWebhookEvent(eventId, { status: 'REJECTED', reason: 'order-not-found', orderCode });
    log(false, `v1 order-not-found ${orderCode}`, rawContent, amount);
    return { httpStatus: 200, body: { ok: true, status: 'REJECTED', reason: 'order-not-found', orderCode } };
  }
  if (order.status !== 'PENDING') {
    const reason = order.status === 'COMPLETED' ? 'order-already-completed' : 'order-expired';
    model.updateWebhookEvent(eventId, { status: 'REJECTED', reason, orderCode });
    log(false, `v1 ${reason} ${orderCode}`, rawContent, amount);
    return { httpStatus: 200, body: { ok: true, status: 'REJECTED', reason, orderCode } };
  }

  // ---- (f) Tài khoản nhận phải đúng STK cấu hình (nếu bank gửi kèm) ----
  if (normalized.accountNumber && normalized.accountNumber !== BANK.accountNumber) {
    model.updateWebhookEvent(eventId, { status: 'REJECTED', reason: 'wrong-receiving-account', orderCode });
    log(false, `v1 wrong account ${normalized.accountNumber}`, rawContent, amount);
    return { httpStatus: 200, body: { ok: true, status: 'REJECTED', reason: 'wrong-receiving-account', orderCode } };
  }

  // ---- (g) Khớp số tiền: PHẢI bằng đúng số tiền đơn hàng ----
  if (!Number.isFinite(amount) || amount <= 0) {
    model.updateWebhookEvent(eventId, { status: 'REJECTED', reason: 'amount-missing', orderCode });
    log(false, `v1 amount-missing ${orderCode}`, rawContent, amount);
    return { httpStatus: 200, body: { ok: true, status: 'REJECTED', reason: 'amount-missing', orderCode } };
  }
  if (amount !== order.amount) {
    model.updateWebhookEvent(eventId, { status: 'REJECTED', reason: 'amount-mismatch', orderCode });
    log(false, `v1 amount-mismatch ${orderCode} (${amount} ≠ ${order.amount})`, rawContent, amount);
    return {
      httpStatus: 200,
      body: { ok: true, status: 'REJECTED', reason: 'amount-mismatch', orderCode, received: amount, expected: order.amount },
    };
  }

  // ---- (h) HOÀN TẤT + CỘNG TIỀN: transaction SQLite (atomic) ----
  let creditResult;
  try {
    const completeTx = db.transaction(() => {
      // Idempotent lớp 2: chỉ UPDATE khi vẫn PENDING — nếu race thì rollback
      const credited = creditTopup(order.email, order.amount, 'topup', `WHE-${eventId}`);
      if (!model.completePaymentOrder(orderCode, eventId, credited)) {
        throw new Error('order-already-completed');
      }
      return credited;
    });
    creditResult = completeTx();
  } catch (err) {
    const reason = String(err?.message || err).includes('order-already-completed') ? 'order-already-completed' : `credit-failed: ${err?.message || err}`;
    model.updateWebhookEvent(eventId, { status: 'REJECTED', reason, orderCode });
    log(false, `v1 ${reason}`, rawContent, amount);
    return { httpStatus: 200, body: { ok: true, status: 'REJECTED', reason, orderCode } };
  }

  // ---- (i) Ghi nhận thành công + push realtime ----
  model.updateWebhookEvent(eventId, { status: 'PROCESSED', orderCode });
  log(true, `v1 credited ${amount} → ${order.email}`, rawContent, amount);

  const payload = {
    orderCode,
    amount: order.amount,
    totalCredit: order.amount + creditResult.bonus + creditResult.vipBonus,
    balance: creditResult.balance,
    bonus: creditResult.bonus,
    vipBonus: creditResult.vipBonus,
    at: Date.now(),
  };
  // Event riêng cho trang thanh toán (auto "Thành công" không cần F5)
  broadcast(`user:${order.email}`, 'payment:completed', payload);
  // Giữ event chung của hệ thống (badge số dư ở SPA cũ cũng cập nhật)
  broadcast(`user:${order.email}`, 'user:updated', { email: order.email, reason: 'topup', actor: 'webhook', user: publicUser(getUser(order.email)) });
  broadcast(null, 'analytics:changed', { reason: 'topup', email: order.email });

  return {
    httpStatus: 200,
    body: {
      ok: true,
      status: 'PROCESSED',
      eventId,
      orderCode,
      credit: { balance: creditResult.balance, bonus: creditResult.bonus, vipBonus: creditResult.vipBonus },
    },
  };
}

// ============================================================
//  3) MÔ PHỎNG NGÂN HÀNG (demo / test end-to-end)
// ============================================================

/** Dựng + ký + gửi 1 webhook "từ ngân hàng" tới chính server */
async function postWebhook({ rawBodyString, eventId, signature, timestamp }) {
  const res = await fetch(`http://localhost:${LOCAL_PORT}${WEBHOOK_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Id': eventId,
      'X-Signature': signature,
      'X-Webhook-Timestamp': String(timestamp),
    },
    body: rawBodyString,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { raw: await res.text().catch(() => '') }; }
  return { status: res.status, body: json };
}

/**
 * Mô phỏng chuyển khoản cho 1 đơn. mode:
 *  - 'ok'            : chuyển đúng tiền + đúng nội dung + chữ ký đúng  → PROCESSED
 *  - 'duplicate'     : gửi lại nguyên văn webhook đã PROCESSED         → DUPLICATE (idempotent)
 *  - 'wrong-amount'  : chữ ký đúng nhưng số tiền sai                   → REJECTED amount-mismatch
 *  - 'bad-signature' : body hợp lệ nhưng ký bằng sai secret            → 401 invalid-signature
 */
export async function simulateTransfer({ code, email, role, mode = 'ok' }) {
  const found = getPaymentOrderForViewer(code, { email, role });
  if (found.error) return found;
  const order = found.order;
  const secret = getSetting('webhook_secret');

  let eventId, rawBodyString, signature, timestamp = Date.now();

  if (mode === 'duplicate') {
    const prior = model.getLastProcessedWebhookEvent(order.code);
    if (!prior) return { status: 400, error: 'Chưa có webhook thành công nào của đơn này — hãy "Chuyển khoản đúng" trước' };
    rawBodyString = prior.rawBody || '{}';
    eventId = prior.id;
    timestamp = prior.receivedAt; // giữ y nguyên như lần đầu
    signature = hmacSha256Hex(rawBodyString, secret);
  } else {
    eventId = `sim-${crypto.randomBytes(8).toString('hex')}`;
    const payload = {
      provider: 'simulate',
      eventId,
      transactionId: `SIM${Date.now()}`,
      amount: mode === 'wrong-amount' ? Math.max(1, order.amount - 5_000) : order.amount,
      content: `CHUYEN TIEN ${order.code} QUA MO BANK`,
      accountNumber: BANK.accountNumber,
      transferredAt: new Date().toISOString(),
    };
    rawBodyString = JSON.stringify(payload);
    // bad-signature: ký bằng "secret sai" để server phải từ chối
    signature = hmacSha256Hex(rawBodyString, mode === 'bad-signature' ? 'wrong-secret-for-testing' : secret);
  }

  const response = await postWebhook({ rawBodyString, eventId, signature, timestamp });
  return {
    mode,
    webhook: {
      url: `POST ${WEBHOOK_PATH}`,
      headers: { 'X-Webhook-Id': eventId, 'X-Signature': signature, 'X-Webhook-Timestamp': String(timestamp) },
      body: JSON.parse(rawBodyString),
    },
    response,
    order: model.getPaymentOrderByCode(order.code),
  };
}
