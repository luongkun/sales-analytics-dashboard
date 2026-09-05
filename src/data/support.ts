import {
  Phone,
  MessageCircle,
  Send,
  Mail,
  Globe,
  Share2,
  type LucideIcon,
} from 'lucide-react';

/**
 * ============================================================
 *  THÔNG TIN LIÊN HỆ — TRANG HỖ TRỢ
 *  ⚠️ Giá trị hiện tại là PLACEHOLDER — thay bằng thông tin thật
 *  của bạn tại đây, trang Hỗ trợ tự cập nhật.
 * ============================================================
 */
export interface ContactChannel {
  id: string;
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  /** Màu accent: nền nhạt + chữ đậm của thẻ (tailwind class) */
  iconBg: string;
  iconColor: string;
}

export const SUPPORT_CONTACTS: ContactChannel[] = [
  {
    id: 'hotline',
    label: 'Hotline / Zalo',
    value: '09xx.xxx.xxx',
    note: 'Kênh nhanh nhất — phản hồi trong vài phút',
    icon: Phone,
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'zalo',
    label: 'Zalo OA',
    value: 'zalo.me/xxxxx',
    note: 'Nhắn tin bất kỳ lúc nào, xử lý theo giờ làm việc',
    icon: MessageCircle,
    iconBg: 'bg-sky-100 dark:bg-sky-500/15',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    value: '@your_telegram',
    note: 'Ưu tiên hỗ trợ đơn hàng số lượng lớn',
    icon: Send,
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/15',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'email',
    label: 'Email',
    value: 'support@luongkun.io',
    note: 'Gửi kèm mã đơn ORD-… để được xử lý nhanh',
    icon: Mail,
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    value: 'fb.com/your_page',
    note: 'Tin nhắn fanpage, phản hồi trong giờ hành chính',
    icon: Share2,
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'website',
    label: 'Website',
    value: 'luongkun.io',
    note: 'Xem bảng giá & chính sách mới nhất',
    icon: Globe,
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
];

export const SUPPORT_HOURS = {
  /** Dòng giờ làm việc chính */
  schedule: '8:00 — 22:00 (T2 → CN)',
  /** Cam kết phản hồi */
  responseTime: 'Phản hồi trong vòng 5 phút trong giờ làm việc',
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const SUPPORT_FAQ: FaqItem[] = [
  {
    question: 'Đơn hàng "Đang xử lý" là sao?',
    answer:
      'Đơn đã được ghi nhận nhưng shop chưa gửi thông tin tài khoản/sản phẩm cho bạn. Ngay khi gửi đủ thông tin, đơn sẽ tự chuyển sang "Hoàn thành" và cập nhật trong trang Đơn hàng đã mua.',
  },
  {
    question: 'Đặt hàng lâu chưa nhận được tài khoản?',
    answer:
      'Bạn vào mục Công cụ → Hỗ trợ, gửi mã đơn (dạng ORD-XXXXXX) qua Zalo hoặc Telegram. Shop sẽ kiểm tra và gửi lại thông tin ngay trong giờ làm việc.',
  },
  {
    question: 'Nạp số dư nhưng tài khoản chưa được cộng?',
    answer:
      'Hãy gửi mã giao dịch kèm email tài khoản qua Zalo/Telegram. Shop xử lý các trường hợp nạp tiền ưu tiên trong 5–10 phút trong giờ làm việc.',
  },
  {
    question: 'Sản phẩm lỗi thì sao?',
    answer:
      'Nếu tài khoản/sản phẩm không đúng mô tả, shop hoàn tiền 100% về số dư trong vòng 24 giờ kể từ khi nhận báo lỗi kèm hình ảnh.',
  },
];
