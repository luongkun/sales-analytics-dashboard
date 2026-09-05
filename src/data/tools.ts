import { Headset, Bot, ScrollText, type LucideIcon } from 'lucide-react';

/**
 * Một công cụ trong nhóm "Công cụ" ở cột bên trái (sidebar).
 * Khi user up công cụ mới: thêm object vào mảng TOOLS bên dưới,
 * sidebar tự động thả xuống danh sách — không cần sửa UI.
 */
export interface ToolItem {
  /** ID duy nhất của công cụ */
  id: string;
  /** Tên hiển thị trong danh sách thả xuống */
  name: string;
  /** Mô tả ngắn hiển thị khi hover (tùy chọn) */
  description?: string;
  /** Icon lucide riêng của công cụ (tùy chọn — mặc định dùng Wrench) */
  icon?: LucideIcon;
  /** Nhãn nổi bật góc phải, vd "Mới" / "Hot" (tùy chọn) */
  badge?: string;
  /** Trang sẽ điều hướng tới khi bấm (tùy chọn) */
  pageId?: string;
}

/**
 * Danh sách công cụ trong sidebar.
 * Bấm vào công cụ → điều hướng tới pageId tương ứng.
 */
export const TOOLS: ToolItem[] = [
  {
    id: 'support',
    name: 'Hỗ trợ',
    description: 'Thông tin liên hệ & giải đáp thắc mắc',
    icon: Headset,
    badge: 'Mới',
    pageId: 'support',
  },
  {
    id: 'chatbot',
    name: 'Chatbot AI',
    description: 'Trợ lý AI Lumi trả lời 24/7',
    icon: Bot,
    badge: 'AI',
    pageId: 'aichat',
  },
  {
    id: 'policy',
    name: 'Chính sách & Điều khoản',
    description: 'Điều khoản mua hàng, bảo hành, hoàn tiền',
    icon: ScrollText,
    pageId: 'policy',
  },
];
