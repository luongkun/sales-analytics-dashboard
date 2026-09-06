import { MiniCart } from '../components/MiniCart';

const SECTIONS = [
  {
    id: 'dieu-khoan-chung',
    title: '1. Điều khoản chung',
    bullets: [
      'Shop chỉ hỗ trợ qua các kênh liên hệ chính thức đăng trong trang Hỗ trợ, không chịu trách nhiệm với các kênh giả mạo.',
      'Giá và tồn kho có thể thay đổi theo thời gian mà không cần báo trước.',
      'Mọi giao dịch được ghi nhận lịch sử — bạn xem lại trong "Đơn hàng đã mua" và trang Nạp số dư.',
    ],
    callout: '',
  },
  {
    id: 'mua-hang',
    title: '2. Mua hàng & thanh toán',
    bullets: [
      'Đặt hàng bằng số dư tài khoản — nạp trước qua trang "Nạp số dư" (chuyển khoản/banking).',
      'Đơn được tạo ở trạng thái "Đang xử lý" ngay khi thanh toán thành công.',
      'Giá trị đơn được trừ thẳng vào số dư — nếu số dư không đủ, đơn sẽ không được tạo.',
      'Mỗi lần đặt nhiều sản phẩm, toàn bộ sản phẩm trong đơn được xử lý cùng lúc.',
    ],
    callout: 'Mẹo: đặt mua theo giờ làm việc (8:00–22:00) để nhận thông tin nhanh nhất.',
  },
  {
    id: 'giao-thong-tin',
    title: '3. Giao thông tin sản phẩm',
    bullets: [
      'Shop bán sản phẩm số nên việc "giao hàng" là gửi thông tin tài khoản/sản phẩm đầy đủ cho bạn.',
      '"Đang xử lý" = shop chưa gửi thông tin — bạn chờ chút nhé, xử lý theo thứ tự.',
      '"Hoàn thành" = thông tin đầy đủ đã nằm trong trang "Đơn hàng đã mua" của bạn.',
      'Hệ thống cập nhật trạng thái realtime — không cần tải lại trang.',
    ],
    callout: 'Nếu đơn "Đang xử lý" quá lâu ngoài giờ làm việc, hãy liên hệ hỗ trợ kèm mã đơn ORD-XXXXXX.',
  },
  {
    id: 'bao-hanh',
    title: '4. Bảo hành & hoàn tiền',
    bullets: [
      'Sản phẩm không đúng mô tả, không đăng nhập được do lỗi từ shop → hoàn tiền 100% về số dư trong vòng 24 giờ.',
      'Bảo hành chỉ áp dụng trong 24 giờ đầu kể từ khi đơn chuyển "Hoàn thành" — báo lỗi kèm hình ảnh/video.',
      'Không hoàn tiền với lý do "đổi ý", "mua nhầm sản phẩm" sau khi đã nhận thông tin.',
      'Lỗi do khách thay đổi mật khẩu, chia sẻ tài khoản với người khác → mất bảo hành.',
      'Mọi hoàn tiền đều về số dư tài khoản, không hoàn qua ngân hàng.',
    ],
    callout: '',
  },
  {
    id: 'nap-tien-vip',
    title: '5. Nạp số dư & hạng VIP',
    bullets: [
      'Nạp số dư qua chuyển khoản — tiền vào tài khoản sau khi shop xác nhận giao dịch.',
      'Tổng giá trị nạp tích lũy quyết định hạng VIP: Đồng → Bạc → Vàng → Kim Cương.',
      'Hạng càng cao được bonus % giá trị nạp càng lớn — chi tiết trong trang "Nâng cấp".',
      'Tiền trong số dư không có hạn sử dụng, không chuyển nhượng giữa các tài khoản.',
    ],
    callout: '',
  },
  {
    id: 'hanh-vi-cam',
    title: '6. Hành vi bị cấm',
    bullets: [
      'Tấn công, dò quét, cố gắng khai thác lỗ hổng hệ thống.',
      'Tự động spam đặt/hủy đơn, lạm dụng nạp — tiền không được hoàn.',
      'Lừa đảo, giả mạo danh tính shop hoặc khách hàng khác.',
    ],
    callout: 'Vi phạm nghiêm trọng: khóa tài khoản vĩnh viễn và tịch thu số dư còn lại.',
  },
  {
    id: 'khieu-nai',
    title: '7. Khiếu nại & tranh chấp',
    bullets: [
      'Mọi khiếu nại gửi qua kênh trong trang Hỗ trợ (Zalo/Telegram/Email) kèm mã đơn + hình ảnh lỗi.',
      'Thời gian xử lý khiếu nại: tối đa 24 giờ làm việc kể từ khi nhận đủ thông tin.',
      'Ngoài 24 giờ kể từ khi nhận hàng: khiếu nại chỉ được xem xét trường hợp đặc biệt.',
      'Quyết định cuối cùng về hoàn tiền thuộc về shop sau khi xác minh tình trạng lỗi.',
    ],
    callout: '',
  },
];

export function PolicyPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chính sách & Điều khoản</h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Quy định mua hàng, giao thông tin sản phẩm, bảo hành hoàn tiền và các điều khoản sử dụng tại Sales Suite Pro.
        </p>
        <p className="mt-2 text-xs text-gray-400">Cập nhật: Tháng 9, 2026 · Áp dụng cho mọi đơn hàng mới</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Mục lục */}
        <nav aria-label="Mục lục chính sách" className="lg:sticky lg:top-0 self-start card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Mục lục</p>
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block px-2.5 py-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 scroll-mt-20">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{s.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              {s.callout && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border-l-4 border-amber-400 flex items-start gap-2.5">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{s.callout}</p>
                </div>
              )}
            </section>
          ))}

          <div className="card-lift bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-200/50 dark:border-indigo-500/20 p-5 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Còn thắc mắc về điều khoản? Hỏi <b className="text-violet-600 dark:text-violet-400">Chatbot AI</b> trong nhóm Công cụ — hoặc liên hệ trực tiếp qua trang{' '}
              <b>Hỗ trợ</b>.
            </p>
          </div>
        </div>
      </div>

      <MiniCart />
    </div>
  );
}
