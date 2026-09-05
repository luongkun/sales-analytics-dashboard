import crypto from 'crypto';
import { insertPaymentRequest } from './db.js';

// =====================================================================
//  VIETQR ĐỘNG — QR chuẩn EMVCo/Napas, sinh riêng cho từng giao dịch
// =====================================================================
//  Flow:
//  1. User bấm "Thanh toán" → server tạo yêu cầu + nội dung CK duy nhất (NAPxxxxxx)
//  2. User quét QR bằng app ngân hàng (QR đã nhúng: ngân hàng + STK + số tiền + nội dung)
//  3. Ngân hàng / cổng thanh toán gọi webhook về server (POST /api/payments/webhook)
//  4. Server đọc nội dung CK → tìm yêu cầu matching → cộng tiền vào DB
//  5. Web client poll trạng thái (cùng lúc nhận realtime user:updated) → UI cập nhật
// =====================================================================

// ===== Cấu hình tài khoản nhận tiền (THẬT) =====
// STK Vietcombank của shop — QR VietQR nhúng STK này, mọi app ngân hàng quét
// sẽ chuyển thẳng về đúng tài khoản (không qua trung gian).
// ⚠️ Muốn đổi: sửa accountNo/accountName rồi restart server.
export const BANK = {
  bin: '970436', // Vietcombank — mã BIN Napas
  name: 'Vietcombank',
  short: 'VCB',
  accountNo: '1071100102', // STK thật — user cấu hình
  accountName: 'NGUYEN THE LUONG',
};

/** Thời gian sống của 1 mã thanh toán: 15 phút */
export const PAYMENT_TTL_MS = 15 * 60 * 1000;

// ---------- VietQR payload (EMVCo QR — chuẩn Napas toàn quốc) ----------

/** Field TLV: id(2) + length(2) + value */
function tlv(id, value) {
  if (value.length > 99) throw new Error('VietQR: giá trị field quá dài (>99 ký tự)');
  return id + String(value.length).padStart(2, '0') + value;
}

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — chuẩn EMVCo */
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Tạo payload QR VietQR (chuỗi mà app ngân hàng quét sẽ hiểu):
 * - 00/01: format + dynamic QR
 * - 38:    A000000727 (GUID Napas) + BIN ngân hàng + STK
 * - 53/54: VND + số tiền
 * - 58:    VN
 * - 62.08: nội dung chuyển khoản (DUY NHẤT cho từng giao dịch)
 * - 63:    CRC
 */
export function buildVietQRPayload({ amount, content }) {
  const merchant =
    tlv('00', 'A000000727') + // GUID Napas (VietQR)
    tlv('01', BANK.bin) +
    tlv('02', BANK.accountNo);
  let payload =
    tlv('00', '01') +
    tlv('01', '12') + // 12 = Dynamic QR
    tlv('38', merchant) +
    tlv('53', '704') + // 704 = VND
    tlv('54', String(amount)) +
    tlv('58', 'VN') +
    tlv('62', tlv('08', content)); // 62.08 = nội dung chuyển khoản
  payload += '6304' + crc16(payload + '6304');
  return payload;
}

// ---------- Sinh mã ----------

/** Nội dung chuyển khoản duy nhất: NAP + 6 số (VD: NAP482913) */
export function newPaymentContent() {
  return 'NAP' + crypto.randomInt(100000, 1000000);
}

/** ID yêu cầu thanh toán */
export function newPaymentId() {
  return 'PR-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomInt(100, 999);
}

/**
 * Tạo yêu cầu thanh toán (retry sinh lại content nếu trùng hiếm gặp)
 * @returns {{id, email, content, amount, createdAt, expiresAt}}
 */
export function createPaymentRequest({ email, amount }) {
  const now = Date.now();
  const req = {
    id: newPaymentId(),
    email,
    content: newPaymentContent(),
    amount,
    createdAt: now,
    expiresAt: now + PAYMENT_TTL_MS,
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    if (insertPaymentRequest(req)) return req;
    req.content = newPaymentContent(); // trùng → sinh lại
  }
  throw new Error('Không thể sinh mã giao dịch duy nhất, thử lại');
}

/** Thông tin public trả về client (kèm QR payload để tự render) */
export function publicPayment(req, extras = {}) {
  return {
    id: req.id,
    content: req.content,
    amount: req.amount,
    status: req.status || 'pending',
    createdAt: req.createdAt,
    expiresAt: req.expiresAt,
    paidAt: req.paidAt || null,
    bank: { name: BANK.name, short: BANK.short, accountNo: BANK.accountNo, accountName: BANK.accountName },
    qrPayload: buildVietQRPayload({ amount: req.amount, content: req.content }),
    ...extras,
  };
}
