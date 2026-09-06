/**
 * vietqr.helper.js — Helper sinh QR VietQR ĐỘNG
 *
 * 2 đường sinh QR:
 *  1) URL ảnh từ CDN img.vietqr.io (chuẩn spec:
 *     https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=&addInfo=&accountName=)
 *  2) Payload EMVCo (chuỗi TLV + CRC16) — dùng khi cần tự render QR ở client
 *     (fallback offline) mà app ngân hàng vẫn quét được.
 */

// Thông tin tài khoản nhận tiền (thay bằng STK thật khi đưa lên production)
export const BANK = {
  bin: '970436', // BIN Vietcombank — dùng làm <BANK_ID> trong URL VietQR
  short: 'VCB',
  name: 'Vietcombank (VCB)',
  accountNumber: '1071100102',
  accountName: 'LUONG VAN KUN',
};

export const MOMO_NUMBER = '0368852235'; // SĐT MoMo (img.vietqr.io hỗ trợ QR MoMo)
export const VIETQR_TEMPLATE = 'compact2'; // template hiển thị: qr_only | compact | compact2 | classic

/** Chuẩn hoá nội dung chuyển khoản: IN HOA + chỉ giữ A-Z0-9 (ngân hàng bỏ dấu/khoảng trắng) */
export function normalizeTransferContent(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** URL ảnh QR VietQR động — kèm amount + addInfo (mã giao dịch duy nhất) + accountName */
export function buildVietQrImageUrl({ amount, content }) {
  return (
    `https://img.vietqr.io/image/${BANK.bin}-${BANK.accountNumber}-${VIETQR_TEMPLATE}.png` +
    `?amount=${Number(amount)}` +
    `&addInfo=${encodeURIComponent(content)}` +
    `&accountName=${encodeURIComponent(BANK.accountName)}`
  );
}

/** URL ảnh QR MoMo (số điện thoại MoMo) */
export function buildMomoQrUrl({ amount, content }) {
  return (
    `https://img.vietqr.io/image/momo-${MOMO_NUMBER}-compact.png` +
    `?amount=${Number(amount)}&addInfo=${encodeURIComponent(content)}`
  );
}

/**
 * CRC-16/CCITT-FALSE (init 0xFFFF, poly 0x1021) — tính trên TỪNG BYTE ASCII
 * của payload (chuẩn EMVCo). Vector kiểm chứng: crc16("123456789") === "29B1".
 * (Bản cũ trong payments.js parse cặp hex — SAI chuẩn, QR tự render không quét được.)
 */
export function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Gói một cặp TLV (Tag + Length 2 chữ số + Value) */
function tlv(id, value) {
  return id + String(value.length).padStart(2, '0') + value;
}

/**
 * Payload EMVCo VietQR động — encode vào QR để app ngân hàng quét trực tiếp.
 * Cấu trúc (chuẩn Napas VietQR):
 *   00 "01"                          Payload Format Indicator
 *   01 "12"                          Point of Initiation: 12 = ĐỘNG (kèm amount/content)
 *   38 { 00 A000000727               Merchant: GUID VietQR
 *        01 { 00 BIN, 01 STK }       Tài khoản thụ hưởng (P2P)
 *        02 QRIBFTTA }               Service code: QR IBFT To Account
 *   53 "704"                         Currency: VND
 *   54 <amount>                      Số tiền
 *   58 "VN"                          Quốc gia
 *   62 { 05 <content> }              Additional data: nội dung chuyển khoản
 *   63 04 <CRC16>                    Checksum (tính trên toàn bộ chuỗi kể cả "6304")
 */
export function buildEmvPayload({ amount, content }) {
  const merchant =
    tlv('00', 'A000000727') +
    tlv('01', tlv('00', BANK.bin) + tlv('01', BANK.accountNumber)) +
    tlv('02', 'QRIBFTTA');

  let payload =
    tlv('00', '01') +
    tlv('01', '12') + // 12 = dynamic QR
    tlv('38', merchant) +
    tlv('53', '704') + // VND
    tlv('54', String(Math.round(Number(amount)))) +
    tlv('58', 'VN');

  const info = normalizeTransferContent(content);
  if (info) payload += tlv('62', tlv('05', info)); // 62.05 = reference (nội dung CK)

  payload += '6304'; // tag CRC + độ dài, giá trị sẽ ghép ngay sau
  return payload + crc16(payload);
}
