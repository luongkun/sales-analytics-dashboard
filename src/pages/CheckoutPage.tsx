import { ArrowLeft, Check, Clock, Landmark, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCart, cartToOrderItems } from '../context/CartContext';
import { InfoRow } from '../components/InfoRow';
import { BANK } from '../data/static';
import { formatCompact, formatVND } from '../lib/formatters';

export function CheckoutPage({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
  const { items, total, getProduct, itemCount } = useCart();

  // Đã đặt xong (giỏ rỗng sau khi placeOrder) → success screen
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pop-in shadow-xl shadow-emerald-500/30">
          <Check size={36} className="text-white" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Đặt hàng thành công!</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Cảm ơn bạn đã mua hàng. Shop đang chuẩn bị và sẽ gửi đầy đủ thông tin tài khoản/slot cho bạn qua kênh liên hệ (thường trong 5-10 phút).
        </p>
        <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-center gap-2.5 text-left">
          <Clock size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">Trạng thái: Đang xử lý — chưa nhận được dữ liệu tài khoản</p>
        </div>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={onHome} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30">
            Về trang chủ
          </button>
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Xem sản phẩm
          </button>
        </div>
      </div>
    );
  }

  const orderItems = cartToOrderItems(items, getProduct);
  const content = items.length ? items.map((i) => `${i.productId.replace('PRD-', '')}x${i.quantity}`).join(' ') : 'DA THANH TOAN';
  const qrUrl = `https://img.vietqr.io/image/${BANK.bin}-${BANK.accountNo}-compact.png?amount=${total}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(BANK.accountName)}`;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="mt-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Thanh toán</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Quét mã QR bằng app ngân hàng để hoàn tất đặt {itemCount} slot</p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* QR */}
        <div className="lg:col-span-3 card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <QrCode size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Quét QR để thanh toán</h3>
              <p className="text-xs text-gray-400">VietQR · Chuyển khoản nhanh 24/7</p>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <div className="bg-white rounded-2xl p-4 shadow-md ring-2 ring-blue-500/20">
              <QRCodeSVG value={qrUrl} size={210} level="M" marginSize={0} />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/30">
              <span className="text-xs text-gray-500 dark:text-gray-400">Số tiền</span>
              <span className="text-sm font-bold text-gradient">{formatCompact(total)}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
              <span className="text-xs text-gray-500 dark:text-gray-400">Nội dung CK</span>
              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{content}</span>
            </div>
            <InfoRow label="Ngân hàng" value="Vietcombank (VCB)" />
            <InfoRow label="Chủ tài khoản" value={BANK.accountName} />
            <InfoRow label="Số tài khoản" value={BANK.accountNo} copy={BANK.accountNo} copyLabel="số tài khoản" />
          </div>

          <div className="mt-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10">
            <Check size={16} className="text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-gray-600 dark:text-gray-400">Bảo mật · Hoàn tiền trong 7 ngày</p>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2 card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-fit">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Đơn hàng của bạn</h3>
          <div className="mt-4 space-y-3">
            {orderItems.map((i) => {
              const p = getProduct(i.productId)!;
              return (
                <div key={i.productId} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold">N</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{i.name}</p>
                    <p className="text-xs text-gray-400">{i.quantity} slot × {formatVND(p.price)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatVND(p.price * i.quantity)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Tạm tính</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{formatVND(total)}đ</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Phí giao dịch</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Miễn phí</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Tổng cộng</span>
              <span className="text-xl font-bold text-gradient">{formatVND(total)}đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
