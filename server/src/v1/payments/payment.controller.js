/**
 * payment.controller.js — CONTROLLER: nhận request → gọi service → trả response.
 * Không chứa nghiệp vụ; chỉ parse input, bắt lỗi và format HTTP.
 */
import * as service from './payment.service.js';

/** POST /api/v1/payments/orders — tạo đơn + nhận QR động */
export function createOrder(req, res) {
  try {
    const { amount, description } = req.body || {};
    const result = service.createPaymentOrder({ email: req.user.email, amount, description });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    return res.status(201).json({ ok: true, order: service.toPublicOrder(result.order) });
  } catch (err) {
    console.error('[v1-payments] createOrder error:', err);
    return res.status(500).json({ ok: false, error: 'Lỗi hệ thống khi tạo đơn' });
  }
}

/** GET /api/v1/payments/orders?limit=20 — lịch sử đơn (chủ đơn / admin) */
export function listOrders(req, res) {
  try {
    const { limit } = req.query;
    const data = service.listPaymentOrdersForViewer({ email: req.user.email, role: req.user.role, limit });
    return res.json({ ok: true, ...data });
  } catch (err) {
    console.error('[v1-payments] listOrders error:', err);
    return res.status(500).json({ ok: false, error: 'Lỗi hệ thống' });
  }
}

/** GET /api/v1/payments/orders/:code — kiểm tra trạng thái đơn (polling) */
export function getOrder(req, res) {
  try {
    const found = service.getPaymentOrderForViewer(req.params.code, { email: req.user.email, role: req.user.role });
    if (found.error) return res.status(found.status || 404).json({ ok: false, error: found.error });
    return res.json({ ok: true, order: service.toPublicOrder(found.order) });
  } catch (err) {
    console.error('[v1-payments] getOrder error:', err);
    return res.status(500).json({ ok: false, error: 'Lỗi hệ thống' });
  }
}

/**
 * POST /api/v1/payments/webhook — receiver từ cổng thanh toán.
 * KHÔNG dùng JWT — xác thực bằng HMAC-SHA256 trên raw body (req.rawBody).
 */
export function receiveWebhook(req, res) {
  try {
    const { httpStatus, body } = service.processWebhook({
      rawBody: req.rawBody ?? '',
      body: req.body,
      headers: req.headers,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress,
    });
    return res.status(httpStatus).json(body);
  } catch (err) {
    console.error('[v1-payments] webhook error:', err);
    return res.status(500).json({ ok: false, error: 'webhook processing failed' });
  }
}

/** GET /api/v1/payments/webhook — mô tả hợp đồng chữ ký (giúp tích hợp bên gửi) */
export function webhookInfo(_req, res) {
  res.json({
    ok: true,
    endpoint: 'POST /api/v1/payments/webhook',
    signature: 'X-Signature: HMAC-SHA256(rawBody, secret) → hex',
    requiredHeaders: ['X-Signature', 'X-Webhook-Id'],
    optionalHeaders: ['X-Webhook-Timestamp (epoch ms, lệch ≤ 5 phút)'],
    body: {
      provider: 'casso | sepay | custom',
      eventId: 'ID duy nhất bên gửi (dedupe → idempotent)',
      transactionId: 'mã giao dịch ngân hàng',
      amount: 'số nguyên VND — phải khớp đơn hàng',
      content: 'nội dung CK chứa mã NAPxxxxxx',
      accountNumber: 'STK nhận (tuỳ chọn — sẽ kiểm tra nếu có)',
    },
  });
}

/** POST /api/v1/payments/orders/:code/simulate — mô phỏng ngân hàng gọi webhook (demo) */
export async function simulateOrder(req, res) {
  try {
    const { mode } = req.body || {};
    const result = await service.simulateTransfer({
      code: req.params.code,
      email: req.user.email,
      role: req.user.role,
      mode: ['ok', 'duplicate', 'wrong-amount', 'bad-signature'].includes(mode) ? mode : 'ok',
    });
    if (result.error) return res.status(result.status || 400).json({ ok: false, error: result.error });
    return res.json({ ok: true, mode: result.mode, webhook: result.webhook, response: result.response, order: service.toPublicOrder(result.order) });
  } catch (err) {
    console.error('[v1-payments] simulate error:', err);
    return res.status(500).json({ ok: false, error: 'Lỗi mô phỏng' });
  }
}
