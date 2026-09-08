/**
 * helpers.js — VIP tiers, publicUser, creditTopup (dùng chung các route)
 */
import { getUser, updateUser, getTotalTopup, createTransaction, getPurchases } from './db.js';

/** Bậc VIP theo tổng nạp (auto) hoặc admin đặt cứng (vipOverride) */
const TIERS = [
  { level: 4, name: 'Kim Cương', min: 5_000_000, bonusPct: 20 },
  { level: 3, name: 'Vàng', min: 3_000_000, bonusPct: 15 },
  { level: 2, name: 'Bạc', min: 1_000_000, bonusPct: 10 },
  { level: 1, name: 'Đồng', min: 200_000, bonusPct: 5 },
];

export function getVipTier(totalTopup, vipOverride) {
  if (vipOverride === 0) return null;
  if (typeof vipOverride === 'number' && vipOverride > 0) {
    const t = TIERS.find((x) => x.level === vipOverride);
    if (t) return { level: t.level, name: t.name, bonusPct: t.bonusPct };
  }
  const topup = Number(totalTopup) || 0;
  return TIERS.find((t) => topup >= t.min) || null;
}

export function publicUser(user) {
  if (!user) return null;
  const totalTopup = getTotalTopup(user.email);
  const vip = getVipTier(totalTopup, user.vipOverride);
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance,
    userCode: user.userCode,
    purchasedUpgrades: getPurchases(user.email),
    avatar: user.avatar,
    totalTopup,
    vipOverride: user.vipOverride ?? null,
    vip: vip ? { level: vip.level, name: vip.name, bonusPct: vip.bonusPct } : null,
  };
}

/**
 * Parse số tiền webhook về integer VND (Task 77 — chống cộng sai số tiền).
 * Chịu mọi dạng gateway gửi:
 * - JSON number 25000.9        → 25001 (VND không có số lẻ — làm tròn)
 * - chuỗi "25000"              → 25000
 * - chuỗi VN "25.000" / "1.000.000" / "1,000,000" / "25 000đ" → 25000 / 1000000
 * - chuỗi rác "abc" / rỗng     → 0 (route trả amount-missing)
 */
export function parseAmountVND(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : 0;
  let s = String(raw ?? '').trim().replace(/[đD\s]/g, '');
  if (!s) return 0;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  // Nhóm 3 chữ số phân tách bởi . hoặc , → hàng nghìn (bỏ hết dấu)
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) return parseInt(s.replace(/[.,]/g, ''), 10);
  // Còn lại: cố parse thập phân rồi làm tròn ("25,5" → 25.5 → 26)
  const f = parseFloat(s.replace(',', '.'));
  return Number.isFinite(f) ? Math.round(f) : 0;
}

/**
 * Cộng tiền nạp + bonus (10% cơ bản + VIP bonus theo bậc).
 * Idempotent theo providerRef không xử lý ở đây — caller lo (đánh dấu payment paid).
 */
export function creditTopup(email, amount, type = 'topup', ref = null) {
  const user = getUser(email);
  if (!user) throw new Error('user not found');
  const amt = Math.round(Number(amount) || 0); // phòng thủ: VND luôn integer
  if (amt <= 0) throw new Error('invalid amount');
  const before = getTotalTopup(email);
  const bonus = Math.floor(amt * 0.1);
  const tierBefore = getVipTier(before, user.vipOverride);
  const vipBonus = tierBefore ? Math.floor(amt * (tierBefore.bonusPct / 100)) : 0;
  const totalCredit = amt + bonus + vipBonus;

  updateUser(email, { balance: user.balance + totalCredit });
  createTransaction({
    id: ref ? `TX-${ref}` : `TX-${Date.now()}`,
    email,
    type,
    amount: amt,
    bonus: bonus + vipBonus,
    timestamp: Date.now(),
  });

  const after = getTotalTopup(email);
  const tierAfter = getVipTier(after, user.vipOverride);
  const tierUp = tierAfter && (!tierBefore || tierAfter.level > tierBefore.level)
    ? { level: tierAfter.level, name: tierAfter.name }
    : null;

  return {
    balance: user.balance + totalCredit,
    bonus,
    vipBonus,
    totalTopup: after,
    tierUp,
  };
}
