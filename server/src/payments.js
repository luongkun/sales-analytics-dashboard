/**
 * payments.js — VietQR (EMVCo payload) + nội dung chuyển khoản
 */
const BANK = {
  bin: '970436',          // VCB
  accountNumber: '1071100102',
  accountName: 'NGUYEN THE LUONG',
};

/** Nội dung CK: NAP + mã ngẫu nhiên 6 số (mỗi request 1 mã riêng) */
export function genPaymentContent() {
  return 'NAP' + String(Math.floor(100000 + Math.random() * 900000));
}

/** Chuỗi số -> hex (chuẩn EMVCo CRC16) */
function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i += 2) {
    crc ^= parseInt(data.slice(i, i + 2), 16) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id, value) {
  return id + String(value.length).padStart(2, '0') + value;
}

/** Payload EMVCo VietQR cho app ngân hàng quét */
export function buildQrPayload(amount, content) {
  const merchant = tlv('00', 'A000000727') +
    tlv('01', tlv('00', BANK.bin) + tlv('01', BANK.accountNumber));
  let p =
    tlv('00', '01') +
    tlv('01', '12') + // 12 = dynamic QR (có amount + content)
    tlv('38', merchant) +
    tlv('53', '704') + // VND
    tlv('54', String(amount));
  if (content) p += tlv('08', content.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  p += '6304';
  return p + crc16(p);
}

/** URL ảnh QR ngân hàng (img.vietqr.io CDN) */
export function buildBankQrUrl(amount, content) {
  return `https://img.vietqr.io/image/${BANK.bin}-${BANK.accountNumber}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(BANK.accountName)}`;
}

/** URL ảnh QR MoMo (img.vietqr.io hỗ trợ số điện thoại MoMo) */
export function buildMomoQrUrl(amount, content) {
  return `https://img.vietqr.io/image/momo-0368852235-compact.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;
}

export function publicPayment(p) {
  if (!p) return null;
  const { id, email, content, amount, status, createdAt, expiresAt, paidAt } = p;
  return {
    id, email, content, amount, status, createdAt, expiresAt, paidAt,
    bank: {
      name: 'Vietcombank',
      accountNo: BANK.accountNumber,
      accountName: BANK.accountName,
    },
    qrPayload: buildQrPayload(amount, content),
    bankQrUrl: buildBankQrUrl(amount, content),
    momoQrUrl: buildMomoQrUrl(amount, content),
    result: p.result ? (typeof p.result === 'string' ? JSON.parse(p.result) : p.result) : null,
  };
}

export { BANK };
