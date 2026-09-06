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
 * Cộng tiền nạp + bonus (10% cơ bản + VIP bonus theo bậc).
 * Idempotent theo providerRef không xử lý ở đây — caller lo (đánh dấu payment paid).
 */
export function creditTopup(email, amount, type = 'topup', ref = null) {
  const user = getUser(email);
  if (!user) throw new Error('user not found');
  const before = getTotalTopup(email);
  const bonus = Math.floor(amount * 0.1);
  const tierBefore = getVipTier(before, user.vipOverride);
  const vipBonus = tierBefore ? Math.floor(amount * (tierBefore.bonusPct / 100)) : 0;
  const totalCredit = amount + bonus + vipBonus;

  updateUser(email, { balance: user.balance + totalCredit });
  createTransaction({
    id: ref ? `TX-${ref}` : `TX-${Date.now()}`,
    email,
    type,
    amount,
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
