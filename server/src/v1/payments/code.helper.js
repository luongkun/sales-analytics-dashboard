/**
 * code.helper.js — Sinh + bóc tách mã giao dịch duy nhất (NAP_ID)
 *
 * Định dạng mã: "NAP" + 6 ký tự [A-Z0-9] loại 0/1/O/I (tránh đánh máy nhầm).
 * Mã này là "chìa khoá" matched giữa nội dung chuyển khoản và đơn hàng PENDING.
 */

const CODE_PREFIX = 'NAP';
const CODE_LENGTH = 6;
// Bảng chữ cái an toàn: không chứa 0,1,O,I
const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Sinh mã ngẫu nhiên, ví dụ: NAP7K2M9X */
export function generateOrderCode() {
  let suffix = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    suffix += SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)];
  }
  return CODE_PREFIX + suffix;
}

/**
 * Parse (bóc tách) mã giao dịch từ nội dung chuyển khoản ngân hàng gửi về.
 * Nội dung thực tế có thể lẫn nhiễu, ví dụ:
 *   "CHUYEN TIEN NAP7K2M9X NAP TIEN TU NGUYEN VAN A"
 *   "nap7k2m9x topup"
 * → luôn trả về mã IN HOA đầy đủ (NAP + 6 ký tự) hoặc null nếu không có.
 * (Regex khớp cả mã cũ 6 chữ số — tương thích dữ liệu pending từ hệ thống cũ.)
 */
export function parseTransactionCode(content) {
  const normalized = String(content || '').toUpperCase();
  const match = normalized.match(new RegExp(`${CODE_PREFIX}[0-9A-Z]{${CODE_LENGTH}}`));
  return match ? match[0] : null;
}
