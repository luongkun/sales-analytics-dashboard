import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  BadgeCheck,
  QrCode as QrIcon,
  Package,
  FileText,
  Clock,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { VIETQR } from '../data/products';
import { formatCurrency } from '../data/salesData';
import { useToast } from '../context/ToastContext';
import AnimatedSection from '../components/AnimatedSection';

interface CheckoutPageProps {
  onBack: () => void;
  onNavigate?: (page: 'overview' | 'orders' | 'products') => void;
}

interface PlacedOrder {
  id: string;
  total: number;
  itemCount: number;
  items: string;
  timestamp: number;
}

const ORDERS_KEY = 'placed-orders';

export function savePlacedOrder(order: PlacedOrder) {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);
    const orders: PlacedOrder[] = saved ? JSON.parse(saved) : [];
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([order]));
  }
}

const CheckoutPage = ({ onBack, onNavigate }: CheckoutPageProps) => {
  const { items, total, itemCount, getProduct, clearCart } = useCart();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [ordered, setOrdered] = useState(false);

  useEffect(() => {
    if (items.length === 0 && !ordered) {
      onBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const transferContent = ordered
    ? 'DA THANH TOAN'
    : items.map((i) => `${i.productId.replace('PRD-', '')}x${i.quantity}`).join(' ');

  const qrValue = `https://img.vietqr.io/image/970436-${VIETQR.accountNumber}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(VIETQR.accountName)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(VIETQR.accountNumber);
      setCopied(true);
      showToast({ type: 'success', title: 'Đã sao chép số tài khoản' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ type: 'error', title: 'Không thể sao chép' });
    }
  };

  const handleConfirmPaid = () => {
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    savePlacedOrder({
      id: orderId,
      total,
      itemCount,
      items: items.map((i) => `${getProduct(i.productId)?.name ?? i.productId} ×${i.quantity}`).join(', '),
      timestamp: Date.now(),
    });
    setOrdered(true);
    clearCart();
    showToast({
      type: 'success',
      title: 'Đặt hàng thành công! 🎉',
      message: `Mã đơn ${orderId} — shop sẽ gửi thông tin tài khoản sớm nhất.`,
      duration: 4000,
    });
  };

  if (ordered) {
    return (
      <div className="max-w-lg mx-auto">
        <AnimatedSection delay={0}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center card-lift">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pop-in">
              <BadgeCheck className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-6">Đặt hàng thành công!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Cảm ơn bạn đã mua hàng. Shop đang chuẩn bị và sẽ gửi đầy đủ thông tin tài khoản/slot cho bạn qua kênh liên hệ (thường trong 5-10 phút).
            </p>
            <p className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-4">
              <Clock className="w-3.5 h-3.5" />
              Trạng thái: Đang xử lý — chưa nhận được dữ liệu tài khoản
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => onNavigate?.('overview')}
                className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Package className="w-4 h-4" />
                Về trang chủ
              </button>
              <button
                onClick={() => onNavigate?.('products')}
                className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Xem sản phẩm
              </button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <AnimatedSection delay={0}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mt-3">Thanh toán</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Quét mã QR bằng app ngân hàng để hoàn tất đặt {itemCount} slot
        </p>
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* QR Payment */}
        <AnimatedSection delay={100} className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <QrIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 dark:text-white">Quét QR để thanh toán</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">VietQR · Chuyển khoản nhanh 24/7</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white rounded-2xl p-4 shadow-lg ring-1 ring-gray-100 relative">
                <QRCodeSVG
                  value={qrValue}
                  size={220}
                  level="M"
                  marginSize={0}
                />
                <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-500/20 pointer-events-none" />
              </div>
              <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
                Số tiền: <span className="font-bold text-gradient">{formatCurrency(total)}</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
                Nội dung CK: <span className="font-mono font-semibold">{transferContent}</span>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Ngân hàng</span>
                <span className="font-semibold text-gray-800 dark:text-white">{VIETQR.bank}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Chủ tài khoản</span>
                <span className="font-semibold text-gray-800 dark:text-white">{VIETQR.accountName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Số tài khoản</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 font-mono font-semibold text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {VIETQR.accountNumber}
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Order Summary */}
        <AnimatedSection delay={200} className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
            <h2 className="font-bold text-gray-800 dark:text-white mb-4">Đơn hàng của bạn</h2>
            <div className="space-y-3">
              {items.map((item) => {
                const product = getProduct(item.productId);
                if (!product) return null;
                return (
                  <div key={item.productId} className="flex items-start justify-between gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white truncate">{product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.quantity} slot × {formatCurrency(product.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatCurrency(product.price * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tạm tính</span>
                <span className="text-gray-700 dark:text-gray-300">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Phí giao dịch</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Miễn phí</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="font-bold text-gray-800 dark:text-white">Tổng cộng</span>
                <span className="text-xl font-bold text-gradient">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmPaid}
              className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Tôi đã thanh toán
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Bảo mật · Hoàn tiền trong 7 ngày
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default CheckoutPage;
