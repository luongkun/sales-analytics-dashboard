// ===== Static data (khớp bundle gốc) =====

export interface VipTierDef {
  level: number;
  name: string;
  min: number;
  bonusPct: number;
  gradient: string;
  benefit: string;
}

export const VIP_TIERS: VipTierDef[] = [
  { level: 1, name: 'Đồng', min: 200_000, bonusPct: 5, gradient: 'from-[#8c6239] to-[#5c3a1d]', benefit: 'Huy hiệu VIP · Thưởng nạp +5%' },
  { level: 2, name: 'Bạc', min: 1_000_000, bonusPct: 10, gradient: 'from-slate-500 to-gray-400', benefit: 'Thưởng nạp +10% · Ưu tiên xử lý đơn' },
  { level: 3, name: 'Vàng', min: 3_000_000, bonusPct: 15, gradient: 'from-yellow-500 to-amber-500', benefit: 'Thưởng nạp +15% · Quà sinh nhật 50.000đ' },
  { level: 4, name: 'Kim Cương', min: 5_000_000, bonusPct: 20, gradient: 'from-purple-500 to-fuchsia-500', benefit: 'Thưởng nạp +20% (cao nhất)' },
];

export function tierFromTotal(total: number): VipTierDef | null {
  for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
    if (total >= VIP_TIERS[i].min) return VIP_TIERS[i];
  }
  return null;
}

export function tierProgress(totalTopup: number) {
  const current = tierFromTotal(totalTopup);
  const nextIdx = current ? VIP_TIERS.findIndex((t) => t.level === current.level) + 1 : 0;
  const next = VIP_TIERS[nextIdx] || null;
  let progressPct = 0;
  let remaining = 0;
  if (current && !next) progressPct = 100;
  else if (!current && next) {
    remaining = next.min - totalTopup;
    progressPct = Math.min(100, Math.round((totalTopup / next.min) * 100));
  } else if (current && next) {
    remaining = next.min - totalTopup;
    const span = next.min - current.min;
    progressPct = Math.min(100, Math.round(((totalTopup - current.min) / span) * 100));
  }
  return { current, next, progressPct, remaining };
}

export const BANK = {
  name: 'Vietcombank (VCB)',
  short: 'VCB',
  bin: '970436',
  accountNo: '1071100102',
  accountName: 'LUONG VAN KUN',
};

export const MOMO = {
  number: '0368852235',
  name: 'NGUYỄN THẾ LƯƠNG',
};

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  price: number;
  gradient: string;
  icon: 'rocket' | 'crown';
  features: string[];
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'UP-01',
    name: 'Gói Pro',
    description: 'Mở khóa toàn bộ sức mạnh dashboard cho cá nhân.',
    price: 199_000,
    gradient: 'from-blue-500 to-indigo-600',
    icon: 'rocket',
    features: ['Không giới hạn số trang & biểu đồ', 'Chế độ tối ưu hiệu năng', 'Lưu cấu hình dashboard đám mây'],
  },
  {
    id: 'UP-06',
    name: 'Gói Doanh nghiệp',
    description: 'Giải pháp toàn diện cho đội ngũ lớn.',
    price: 999_000,
    gradient: 'from-slate-600 to-gray-800',
    icon: 'crown',
    features: ['Tất cả tính năng các gói', 'Không giới hạn thành viên', 'Quản trị phân quyền nâng cao'],
  },
];

export interface SupportChannel {
  id: string;
  label: string;
  value: string;
  note: string;
  icon: 'phone' | 'message-circle' | 'send' | 'mail' | 'facebook' | 'globe';
  image?: string;
}

import iconZalo from '../assets/icon-zalo.svg';
import iconTelegram from '../assets/icon-telegram.svg';
import iconFacebook from '../assets/icon-facebook.svg';

export const SUPPORT_CHANNELS: SupportChannel[] = [
  { id: 'hotline', label: 'Hotline / Zalo', value: '09xx.xxx.xxx', note: 'Kênh nhanh nhất — phản hồi trong vài phút', icon: 'phone' },
  { id: 'zalo-oa', label: 'Zalo OA', value: 'zalo.me/xxxxx', note: 'Nhắn tin bất kỳ lúc nào, xử lý theo giờ làm việc', icon: 'message-circle', image: iconZalo },
  { id: 'telegram', label: 'Telegram', value: '@your_telegram', note: 'Ưu tiên hỗ trợ đơn hàng số lượng lớn', icon: 'send', image: iconTelegram },
  { id: 'email', label: 'Email', value: 'support@luongkun.io', note: 'Gửi kèm mã đơn ORD-… để được xử lý nhanh', icon: 'mail' },
  { id: 'facebook', label: 'Facebook', value: 'fb.com/your_page', note: 'Tin nhắn fanpage, phản hồi trong giờ hành chính', icon: 'facebook', image: iconFacebook },
  { id: 'website', label: 'Website', value: 'luongkun.io', note: 'Xem bảng giá & chính sách mới nhất', icon: 'globe' },
];

export const FAQ_ITEMS = [
  {
    q: 'Đơn hàng "Đang xử lý" là sao?',
    a: 'Đơn đã được ghi nhận nhưng shop chưa gửi thông tin tài khoản/sản phẩm cho bạn. Ngay khi gửi đủ thông tin, đơn sẽ tự chuyển sang "Hoàn thành" và cập nhật trong trang Đơn hàng đã mua.',
  },
  {
    q: 'Đặt hàng lâu chưa nhận được tài khoản?',
    a: 'Bạn vào mục Công cụ → Hỗ trợ, gửi mã đơn (dạng ORD-XXXXXX) qua Zalo hoặc Telegram. Shop sẽ kiểm tra và gửi lại thông tin ngay trong giờ làm việc.',
  },
  {
    q: 'Nạp số dư nhưng tài khoản chưa được cộng?',
    a: 'Hãy gửi mã giao dịch kèm email tài khoản qua Zalo/Telegram. Shop xử lý các trường hợp nạp tiền ưu tiên trong 5–10 phút trong giờ làm việc.',
  },
  {
    q: 'Sản phẩm lỗi thì sao?',
    a: 'Nếu tài khoản/sản phẩm không đúng mô tả, shop hoàn tiền 100% về số dư trong vòng 24 giờ kể từ khi nhận báo lỗi kèm hình ảnh.',
  },
];

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: 'life-buoy' | 'bot' | 'scroll-text';
  badge?: string;
  pageId: string;
}

export const TOOLS: ToolItem[] = [
  { id: 'support', name: 'Hỗ trợ', description: 'Thông tin liên hệ & giải đáp thắc mắc', icon: 'life-buoy', badge: 'Mới', pageId: 'support' },
  { id: 'chatbot', name: 'Chatbot AI', description: 'Trợ lý AI Lumi trả lời 24/7', icon: 'bot', badge: 'AI', pageId: 'aichat' },
  { id: 'policy', name: 'Chính sách & Điều khoản', description: 'Điều khoản mua hàng, bảo hành, hoàn tiền', icon: 'scroll-text', pageId: 'policy' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Giải trí': '#ef4444',
  'Điện tử': '#3b82f6',
  'Thời trang': '#8b5cf6',
  'Thực phẩm': '#f59e0b',
  'Gia dụng': '#10b981',
};

export const AVATAR_GRADIENTS: Record<string, string> = {
  default: 'from-blue-500 to-indigo-600',
  purple: 'from-purple-500 to-fuchsia-600',
  emerald: 'from-emerald-500 to-teal-600',
  orange: 'from-orange-500 to-amber-600',
  rose: 'from-rose-500 to-pink-600',
  slate: 'from-slate-500 to-gray-600',
};

export const VIEW_TITLES: Record<string, string> = {
  overview: 'Dashboard Phân tích Doanh thu',
  revenue: 'Phân tích Doanh thu',
  orders: 'Quản lý Đơn hàng',
  products: 'Sản phẩm & Gói dịch vụ',
  checkout: 'Thanh toán',
  myorders: 'Đơn hàng đã mua',
  customers: 'Phân tích Khách hàng',
  reports: 'Báo cáo & KPI',
  upgrades: 'Nâng cấp',
  profile: 'Hồ sơ cá nhân',
  topup: 'Nạp số dư',
  admin: 'Quản trị người dùng',
  support: 'Hỗ trợ & Liên hệ',
  aichat: 'Trợ lý AI Lumi',
  policy: 'Chính sách & Điều khoản',
};

export const STATUS_META: Record<string, { color: string; pill: string }> = {
  'Hoàn thành': { color: 'text-emerald-600 dark:text-emerald-400', pill: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  'Đang xử lý': { color: 'text-amber-600 dark:text-amber-400', pill: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  'Đã hủy': { color: 'text-rose-600 dark:text-rose-400', pill: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400' },
};
