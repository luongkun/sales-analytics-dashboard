import {
  ScrollText,
  ShoppingCart,
  PackageCheck,
  ShieldCheck,
  Wallet,
  Ban,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

/**
 * ============================================================
 *  CHÍNH SÁCH & ĐIỀU KHOẢN — nội dung do shop soạn
 *  Chỉnh sửa nội dung tại đây, trang tự cập nhật.
 * ============================================================
 */
export interface PolicySection {
  id: string;
  icon: LucideIcon;
  title: string;
  /** Đoạn văn mở đầu (tùy chọn) */
  intro?: string;
  /** Gạch đầu dòng chính */
  items: string[];
  /** Ghi chú nổi bật cuối mục (tùy chọn) */
  note?: string;
}

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'chung',
    icon: ScrollText,
    title: '1. Điều khoản chung',
    intro:
      'Khi đặt hàng tại Sales Suite Pro, bạn đồng ý với toàn bộ điều khoản dưới đây. Vui lòng đọc kỹ trước khi mua.',
    items: [
      'Tài khoản chỉ dành cho người đủ 15 tuổi trở lên hoặc có sự giám sát của phụ huynh.',
      'Mọi giao dịch được ghi nhận lịch sử — bạn xem lại trong "Đơn hàng đã mua" và trang Nạp số dư.',
      'Shop chỉ hỗ trợ qua các kênh liên hệ chính thức đăng trong trang Hỗ trợ, không chịu trách nhiệm với các kênh giả mạo.',
      'Giá và tồn kho có thể thay đổi theo thời gian mà không cần báo trước.',
    ],
  },
  {
    id: 'mua-hang',
    icon: ShoppingCart,
    title: '2. Mua hàng & thanh toán',
    items: [
      'Đặt hàng bằng số dư tài khoản — nạp trước qua trang "Nạp số dư" (chuyển khoản/banking).',
      'Đơn được tạo ở trạng thái "Đang xử lý" ngay khi thanh toán thành công.',
      'Giá trị đơn được trừ thẳng vào số dư — nếu số dư không đủ, đơn sẽ không được tạo.',
      'Mỗi lần đặt nhiều sản phẩm, toàn bộ sản phẩm trong đơn được xử lý cùng lúc.',
    ],
    note: 'Mẹo: đặt mua theo giờ làm việc (8:00–22:00) để nhận thông tin nhanh nhất.',
  },
  {
    id: 'giao-du-lieu',
    icon: PackageCheck,
    title: '3. Giao thông tin sản phẩm',
    intro:
      'Shop bán sản phẩm số nên việc "giao hàng" là gửi thông tin tài khoản/sản phẩm đầy đủ cho bạn.',
    items: [
      '"Đang xử lý" = shop chưa gửi thông tin — bạn chờ chút nhé, xử lý theo thứ tự.',
      '"Hoàn thành" = thông tin đầy đủ đã nằm trong trang "Đơn hàng đã mua" của bạn.',
      'Nếu đơn "Đang xử lý" quá lâu ngoài giờ làm việc, hãy liên hệ hỗ trợ kèm mã đơn ORD-XXXXXX.',
      'Hệ thống cập nhật trạng thái realtime — không cần tải lại trang.',
    ],
  },
  {
    id: 'bao-hanh',
    icon: ShieldCheck,
    title: '4. Bảo hành & hoàn tiền',
    items: [
      'Sản phẩm không đúng mô tả, không đăng nhập được do lỗi từ shop → hoàn tiền 100% về số dư trong vòng 24 giờ.',
      'Bảo hành chỉ áp dụng trong 24 giờ đầu kể từ khi đơn chuyển "Hoàn thành" — báo lỗi kèm hình ảnh/video.',
      'Không hoàn tiền với lý do "đổi ý", "mua nhầm sản phẩm" sau khi đã nhận thông tin.',
      'Lỗi do khách thay đổi mật khẩu, chia sẻ tài khoản với người khác → mất bảo hành.',
    ],
    note: 'Mọi hoàn tiền đều về số dư tài khoản, không hoàn qua ngân hàng.',
  },
  {
    id: 'nap-vip',
    icon: Wallet,
    title: '5. Nạp số dư & hạng VIP',
    items: [
      'Nạp số dư qua chuyển khoản — tiền vào tài khoản sau khi shop xác nhận giao dịch.',
      'Tổng giá trị nạp tích lũy quyết định hạng VIP: Đồng → Bạc → Vàng → Bạch Kim → Kim Cương.',
      'Hạng càng cao được bonus % giá trị nạp càng lớn — chi tiết trong trang "Nâng cấp".',
      'Tiền trong số dư không có hạn sử dụng, không chuyển nhượng giữa các tài khoản.',
    ],
  },
  {
    id: 'cam',
    icon: Ban,
    title: '6. Hành vi bị cấm',
    items: [
      'Chia sẻ lại, bán lại tài khoản đã mua cho người khác.',
      'Tấn công, dò quét, cố gắng khai thác lỗ hổng hệ thống.',
      'Tự động spam đặt/hủy đơn, lạm dụng nạp — tiền không được hoàn.',
      'Lừa đảo, giả mạo danh tính shop hoặc khách hàng khác.',
    ],
    note: 'Vi phạm nghiêm trọng: khóa tài khoản vĩnh viễn và tịch thu số dư còn lại.',
  },
  {
    id: 'khieu-nai',
    icon: AlertTriangle,
    title: '7. Khiếu nại & tranh chấp',
    items: [
      'Mọi khiếu nại gửi qua kênh trong trang Hỗ trợ (Zalo/Telegram/Email) kèm mã đơn + hình ảnh lỗi.',
      'Thời gian xử lý khiếu nại: tối đa 24 giờ làm việc kể từ khi nhận đủ thông tin.',
      'Ngoài 24 giờ kể từ khi nhận hàng: khiếu nại chỉ được xem xét trường hợp đặc biệt.',
      'Quyết định cuối cùng về hoàn tiền thuộc về shop sau khi xác minh tình trạng lỗi.',
    ],
  },
];

export const POLICY_UPDATED = 'Cập nhật: Tháng 9, 2026';
