// =====================================================================
//  WEBHOOK BẢO MẬT — xác thực request từ cổng thanh toán / ngân hàng
// =====================================================================
//  Cổng THẬT hỗ trợ sẵn 2 định dạng:
//  · Casso  (casso.vn)  : POST JSON { error, data: { description, amount, when, … } }
//                         header  x-casso-signature = hex HMAC-SHA256(rawBody, api_key)
//  · SePay  (sepay.vn)  : POST query ?api_key=…&code=…&content=NAPxxxxxx&amount=…
//                         (hoặc JSON body cùng field)
//  · Custom gateway     : { content, amount, gateway } + secret (query/header) hoặc HMAC
//
//  Lớp bảo mật (tất cả BẮT BUỘC, không còn chế độ "không secret"):
//  1. Rate limit        : 30 request / phút / IP (chống brute-force mã NAP)
//  2. Xác thực          : HMAC-SHA256 timing-safe HOẶC secret timing-safe
//  3. Đối soát          : nội dung CK phải khớp mã NAPxxxxxx đang pending + đúng số tiền
//  4. Idempotent        : giao dịch đã paid không cộng lại tiền
//  5. Audit             : mọi request (được/sai) đều ghi webhook_logs để admin xem
// =====================================================================

import crypto from 'crypto';
import { getSetting, setSetting } from './db.js';

const SECRET_KEY = 'webhook_secret';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Secret giữ trong DB (app_settings) — sống sót restart, admin xoay được
let cachedSecret = null;

/** Lấy webhook secret (tự sinh 64-ký tự hex lần đầu) */
export function getWebhookSecret() {
  if (cachedSecret) return cachedSecret;
  let s = getSetting(SECRET_KEY);
  if (!s || !/^[A-Za-z0-9_-]{12,128}$/.test(s)) {
    s = crypto.randomBytes(32).toString('hex');
    setSetting(SECRET_KEY, s);
  }
  cachedSecret = s;
  return s;
}

/** Đặt secret tuỳ ý (dán API key của Casso/SePay) — admin only */
export function setWebhookSecret(secret) {
  if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{12,128}$/.test(secret)) {
    throw new Error('Secret phải 12–128 ký tự (chỉ chữ, số, gạch dưới/giữa)');
  }
  setSetting(SECRET_KEY, secret);
  cachedSecret = secret;
  return secret;
}

/** Xoay secret ngẫu nhiên mới — vô hiệu hoá secret cũ ngay lập tức */
export function rotateWebhookSecret() {
  const s = crypto.randomBytes(32).toString('hex');
  return setWebhookSecret(s);
}

// ----- So sánh timing-safe (chống timing attack) -----

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // vẫn tiêu tốn thời gian so sánh để không leak độ dài qua thời gian
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function hmacHex(secret, raw) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

/** Hậu bí danh HMAC của secret: Casso ký bằng API key đã BỎ GẠCH + lowercase,
 *  nên nếu secret là UUID thì thử cả 2 biến thể. */
function secretHmacCandidates(secret) {
  const list = [secret];
  if (UUID_RE.test(secret)) list.push(secret.replace(/-/g, '').toLowerCase());
  return list;
}

/**
 * Xác thực 1 request webhook. Chấp nhận 1 trong 2 cách (ưu tiên HMAC):
 *  A) HMAC-SHA256: header x-casso-signature / x-signature / x-webhook-signature
 *     = hex HMAC của RAW body ký bằng webhook secret
 *  B) Secret trực tiếp: query ?secret= / ?api_key= hoặc header x-webhook-secret
 * @returns {{ ok: true, method: 'hmac' | 'secret' } | { ok: false, reason: string }}
 */
export function verifyWebhookRequest(req) {
  const secret = getWebhookSecret();
  const raw = req.rawBody || Buffer.alloc(0);

  // (A) HMAC signature — cách an toàn nhất (Casso dùng kiểu này)
  const sigHeader =
    req.get('x-casso-signature') || req.get('x-signature') || req.get('x-webhook-signature');
  if (sigHeader) {
    const supplied = String(sigHeader).trim().toLowerCase();
    const valid = secretHmacCandidates(secret).some((cand) =>
      timingSafeEqualStr(supplied, hmacHex(cand, raw))
    );
    return valid
      ? { ok: true, method: 'hmac' }
      : { ok: false, reason: 'Chữ ký HMAC không khớp (signature sai hoặc body bị sửa)' };
  }

  // (B) Secret trực tiếp — SePay dùng ?api_key=… (hỗ trợ cả header cũ)
  const q = req.query || {};
  const supplied = q.secret || q.api_key || q.token || req.get('x-webhook-secret');
  if (supplied) {
    const valid = timingSafeEqualStr(String(supplied).trim(), secret);
    return valid
      ? { ok: true, method: 'secret' }
      : { ok: false, reason: 'Webhook secret không hợp lệ' };
  }

  return { ok: false, reason: 'Thiếu thông tin xác thực (HMAC signature hoặc secret)' };
}

// ----- Tách dữ liệu từ body/query các định dạng cổng thật -----

/**
 * Đọc (content, amount, provider, ref) từ request — hỗ trợ Casso / SePay / custom.
 * @returns {{ content: string|null, amount: number|NaN, provider: string, ref: string|null }}
 */
export function extractTransfer(req) {
  const body = req.body || {};
  const q = req.query || {};
  const casso = body.data && typeof body.data === 'object' ? body.data : null;

  // Nội dung CK nằm rải rác tùy cổng: gộp hết rồi regex tìm mã NAPxxxxxx
  const text = [
    casso && casso.description,
    casso && casso.content,
    body.description,
    body.content,
    body.code,
    q.content,
    q.code,
  ]
    .filter(Boolean)
    .map(String)
    .join(' ');
  const match = text.toUpperCase().match(/NAP\d{6}/);

  const rawAmount = casso ? casso.amount : body.amount !== undefined ? body.amount : q.amount;
  const amount = Number(rawAmount);

  const provider =
    req.get('x-casso-signature') || casso
      ? 'casso'
      : q.api_key || q.webhook_id || body.gateway || q.gateway
        ? 'sepay'
        : 'custom';
  const ref =
    (casso && (casso.id || casso.bank_reference)) || body.id || body.transactionId || q.code || null;

  return { content: match ? match[0] : null, amount, provider, ref: ref ? String(ref) : null };
}

// ----- Rate limit in-memory: 30 req / 60s / IP -----

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map(); // ip -> timestamps

/** true = cho qua, false = vượt giới hạn */
export function webhookRateOk(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return false;
  }
  arr.push(now);
  hits.set(ip, arr);
  // dọn map khi phình to (chống memory leak)
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  return true;
}

/** Lấy IP client (đi qua gateway có x-forwarded-for) */
export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req.ip || 'unknown';
}
