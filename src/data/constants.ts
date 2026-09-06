/**
 * Hằng số hiển thị phía client (đặc tả §5.10 / §4.2).
 * Lưu ý: hạng VIP của user luôn lấy từ server (user.vip) — bảng dưới chỉ dùng
 * cho hiển thị thang VIP / gradient / hint hạng tiếp theo.
 */

export interface VipTierInfo {
  level: number;
  name: string;
  min: number;
  bonusPct: number;
  gradient: string;
  benefit: string;
}

export const VIP_TIERS: VipTierInfo[] = [
  { level: 1, name: 'Đồng', min: 100_000, bonusPct: 5, gradient: 'from-[#8c6239] to-[#5c3a1d]', benefit: 'Huy hiệu VIP · Thưởng nạp +5%' },
  { level: 2, name: 'Bạc', min: 500_000, bonusPct: 10, gradient: 'from-slate-500 to-gray-400', benefit: 'Thưởng nạp +10% · Ưu tiên xử lý đơn' },
  { level: 3, name: 'Vàng', min: 1_000_000, bonusPct: 15, gradient: 'from-yellow-500 to-amber-500', benefit: 'Thưởng nạp +15% · Quà sinh nhật 50.000đ' },
  { level: 4, name: 'Kim Cương', min: 5_000_000, bonusPct: 20, gradient: 'from-purple-500 to-fuchsia-500', benefit: 'Thưởng nạp +20% (cao nhất)' },
];

export function vipTierByLevel(level: number): VipTierInfo | undefined {
  return VIP_TIERS.find((t) => t.level === level);
}

export function vipGradient(level: number | null | undefined): string {
  if (!level) return 'from-gray-400 to-gray-500';
  return vipTierByLevel(level)?.gradient ?? 'from-gray-400 to-gray-500';
}

/** Hạng kế tiếp (null nếu đã cao nhất). */
export function nextVipTier(level: number | null | undefined): VipTierInfo | null {
  const current = level ?? 0;
  return VIP_TIERS.find((t) => t.level === current + 1) ?? null;
}

/** % tiến độ lên hạng kế tiếp (100 nếu đã cao nhất). */
export function vipProgressPct(totalTopup: number, level: number | null | undefined): number {
  if (!level) {
    const first = VIP_TIERS[0];
    return Math.min(100, Math.round((totalTopup / first.min) * 100));
  }
  const next = nextVipTier(level);
  if (!next) return 100;
  const current = vipTierByLevel(level)!;
  const span = next.min - current.min;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((totalTopup - current.min) / span) * 100)));
}

/** Số đ còn thiếu lên hạng kế tiếp. */
export function vipRemaining(totalTopup: number, level: number | null | undefined): number {
  const next = nextVipTier(level);
  if (!next) return 0;
  return Math.max(0, next.min - totalTopup);
}

/** Tools nhóm CÔNG CỤ trong sidebar (mảng `ha`). */
export interface ToolInfo {
  id: string;
  name: string;
  description: string;
  badge: string | null;
  pageId: string;
}

export const TOOLS: ToolInfo[] = [
  {
    id: 'support',
    name: 'Hỗ trợ',
    description: 'Thông tin liên hệ & giải đáp thắc mắc',
    badge: 'Mới',
    pageId: 'support',
  },
  {
    id: 'chatbot',
    name: 'Chatbot AI',
    description: 'Trợ lý AI Lumi trả lời 24/7',
    badge: 'AI',
    pageId: 'aichat',
  },
  {
    id: 'policy',
    name: 'Chính sách & Điều khoản',
    description: 'Điều khoản mua hàng, bảo hành, hoàn tiền',
    badge: null,
    pageId: 'policy',
  },
];
