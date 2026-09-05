import type { LucideIcon } from 'lucide-react';

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
}

/**
 * Danh sách công cụ — HIỆN ĐANG TRỐNG.
 * User sẽ upload nội dung công cụ sau; UI sidebar đang hiển thị
 * trạng thái chờ "Chưa có công cụ" cho tới khi mảng này có phần tử.
 */
export const TOOLS: ToolItem[] = [];
