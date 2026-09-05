/**
 * Hệ thống VIP theo tổng tiền đã nạp (SUM transactions type='topup').
 * Tier tính ở backend (publicUser.vip) — file này chỉ để UI render đồng bộ:
 * màu, icon, mô tả quyền lợi, thanh tiến độ lên hạng tiếp theo.
 * Mỗi cấp có bộ màu riêng (gradient, chữ, vạch, ring, nền badge, icon Crown).
 */
import type { ComponentType } from 'react';
import { Crown } from 'lucide-react';

export interface VipTierDef {
  level: number;
  name: string;
  min: number;
  bonusPct: number;
  /** gradient chip đậm (badge chính ở Profile) */
  gradient: string;
  /** màu chữ/điểm nhấn */
  text: string;
  /** màu vạch tiến độ */
  bar: string;
  /** ring quanh avatar */
  ring: string;
  /** viền + nền mềm cho khối badge (UserMenu, TopUp) — đổi theo cấp */
  soft: string;
  /** màu icon Crown — đổi theo cấp */
  crown: string;
  /** màu shadow/hào quang huy hiệu */
  glow: string;
  benefit: string;
}

export const VIP_TIERS: VipTierDef[] = [
  {
    level: 1,
    name: 'Đồng',
    min: 100_000,
    bonusPct: 5,
    gradient: 'from-amber-700 to-orange-600',
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'from-amber-600 to-orange-500',
    ring: 'ring-amber-400/60',
    soft: 'border-amber-300/60 dark:border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-orange-500/5 dark:from-amber-400/10 dark:to-orange-400/5',
    crown: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-amber-600/40',
    benefit: 'Huy hiệu VIP · Thưởng nạp +5%',
  },
  {
    level: 2,
    name: 'Bạc',
    min: 500_000,
    bonusPct: 10,
    gradient: 'from-slate-500 to-gray-400',
    text: 'text-slate-600 dark:text-slate-300',
    bar: 'from-slate-500 to-gray-400',
    ring: 'ring-slate-300/60',
    soft: 'border-slate-300/70 dark:border-slate-400/25 bg-gradient-to-r from-slate-400/10 to-gray-400/5 dark:from-slate-300/10 dark:to-gray-400/5',
    crown: 'text-slate-500 dark:text-slate-300',
    glow: 'shadow-slate-400/50',
    benefit: 'Thưởng nạp +10% · Ưu tiên xử lý đơn',
  },
  {
    level: 3,
    name: 'Vàng',
    min: 1_000_000,
    bonusPct: 15,
    gradient: 'from-yellow-500 to-amber-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    bar: 'from-yellow-500 to-amber-400',
    ring: 'ring-yellow-400/70',
    soft: 'border-yellow-300/70 dark:border-yellow-400/25 bg-gradient-to-r from-yellow-400/15 to-amber-400/5 dark:from-yellow-400/10 dark:to-amber-400/5',
    crown: 'text-yellow-500 dark:text-yellow-400',
    glow: 'shadow-yellow-500/40',
    benefit: 'Thưởng nạp +15% · Quà sinh nhật 50.000đ',
  },
  {
    level: 4,
    name: 'Kim Cương',
    min: 5_000_000,
    bonusPct: 20,
    gradient: 'from-purple-500 to-fuchsia-500',
    text: 'text-purple-600 dark:text-purple-300',
    bar: 'from-purple-500 to-fuchsia-400',
    ring: 'ring-purple-300/70',
    soft: 'border-purple-300/60 dark:border-purple-400/25 bg-gradient-to-r from-purple-500/15 to-fuchsia-500/5 dark:from-purple-400/15 dark:to-fuchsia-400/5',
    crown: 'text-purple-500 dark:text-purple-300',
    glow: 'shadow-purple-500/40',
    benefit: 'Thưởng nạp +20% · CSKH riêng 1-1 · Ưu đãi độc quyền',
  },
];

export interface VipInfo {
  tier: VipTierDef | null;
  nextTier: VipTierDef | null;
  totalTopup: number;
  /** 0–100 tiến độ tới hạng kế tiếp (100 nếu đã max) */
  progressPct: number;
  /** số tiền còn thiếu để lên hạng kế tiếp */
  remaining: number;
}

/**
 * Tính hạng VIP. Nếu admin đã đặt hạng cứng (vipOverride: 0-4) thì dùng hạng đó,
 * ngược lại tính tự động theo tổng tiền nạp.
 */
export function getVipInfo(totalTopup: number, vipOverride?: number | null): VipInfo {
  const t = Math.max(0, Number(totalTopup) || 0);
  let tier: VipTierDef | null = null;
  if (typeof vipOverride === 'number' && vipOverride >= 0) {
    tier = VIP_TIERS.find((d) => d.level === vipOverride) ?? null;
  } else {
    for (const def of VIP_TIERS) {
      if (t >= def.min) tier = def;
    }
  }
  const idx = tier ? VIP_TIERS.findIndex((d) => d.level === tier.level) : -1;
  const nextTier = idx >= 0 && idx < VIP_TIERS.length - 1 ? VIP_TIERS[idx + 1] : null;
  if (!nextTier) {
    return { tier, nextTier: null, totalTopup: t, progressPct: 100, remaining: 0 };
  }
  const base = tier ? tier.min : 0;
  const span = nextTier.min - base;
  const progressPct = Math.min(100, Math.max(0, Math.round(((t - base) / span) * 100)));
  return { tier, nextTier, totalTopup: t, progressPct, remaining: Math.max(0, nextTier.min - t) };
}

export function vipIconOf(): ComponentType<{ className?: string }> {
  return Crown;
}
