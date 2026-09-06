/**
 * signature.helper.js — Chữ ký HMAC-SHA256 cho webhook chuyển khoản
 *
 * Hợp đồng chữ ký (bên gửi — ngân hàng/Casso/SePay/SDK của bạn):
 *   X-Signature: <hex> = HMAC-SHA256(RAW BODY (UTF-8), WEBHOOK_SECRET)
 *   X-Webhook-Timestamp: <epoch ms>   (tuỳ chọn — chống replay, sai lệch ≤ 5 phút)
 *
 * So sánh bằng timingSafeEqual để chống tấn công so sánh từng byte.
 */
import crypto from 'crypto';

/** Tính chữ ký HMAC-SHA256 (hex) trên raw body */
export function hmacSha256Hex(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

/** So sánh 2 chuỗi hex an toàn về thời gian (tránh timing attack) */
export function safeEqualHex(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify toàn bộ phần bảo mật của một webhook.
 * @returns {{ok: boolean, error?: string, expected?: string}}
 */
export function verifyWebhookSignature({ signature, rawBody, secret, timestamp, toleranceMs = 5 * 60_000 }) {
  if (!secret) return { ok: false, error: 'server-missing-secret' };
  if (!signature) return { ok: false, error: 'missing-signature' };

  // Chống replay: timestamp (nếu gửi kèm) chỉ lệch tối đa toleranceMs
  if (timestamp !== undefined && timestamp !== null && String(timestamp).length > 0) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > toleranceMs) {
      return { ok: false, error: 'stale-timestamp' };
    }
  }

  const expected = hmacSha256Hex(rawBody ?? '', secret);
  if (!safeEqualHex(signature, expected)) {
    return { ok: false, error: 'invalid-signature', expected };
  }
  return { ok: true, expected };
}
