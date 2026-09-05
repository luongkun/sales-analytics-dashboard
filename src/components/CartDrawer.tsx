import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight, Wallet, AlertTriangle, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatNumber } from '../data/salesData';
import { useToast } from '../context/ToastContext';
import { useState } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, total, itemCount, removeFromCart, updateQuantity, getProduct, clearCart } = useCart();
  const { user, placeOrder } = useAuth();
  const { showToast } = useToast();
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [justPaid, setJustPaid] = useState(false);
  const [paying, setPaying] = useState(false);

  const balance = user?.balance ?? 0;
  const canAfford = balance >= total;
  const balanceAfter = balance - total;
  const confirming = confirmedTotal !== null && confirmedTotal === total;

  const handlePayWithBalance = async () => {
    if (!user || !canAfford || paying) return;
    setPaying(true);
    const res = await placeOrder(
      items.map((i) => ({
        productId: i.productId,
        name: getProduct(i.productId)?.name ?? i.productId,
        quantity: i.quantity,
      })),
      total
    );
    setPaying(false);
    if (res.ok) {
      clearCart();
      setConfirmedTotal(null);
      setJustPaid(true);
      setTimeout(() => setJustPaid(false), 1500);
      showToast({
        type: 'success',
        title: 'Thanh toán thành công! 🎉',
        message: `Số dư còn ${formatNumber(res.balance ?? balanceAfter)}đ`,
        duration: 4000,
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      showToast({
        type: 'error',
        title: 'Thanh toán thất bại',
        message: res.error ?? 'Có lỗi từ máy chủ',
        duration: 4000,
      });
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Giỏ hàng"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30">
              <ShoppingCart className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-white">Giỏ hàng</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{itemCount} slot đã chọn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Đóng giỏ hàng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <ShoppingCart className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Giỏ hàng trống</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Khám phá các gói dịch vụ và thêm slot bạn cần.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                Xem sản phẩm
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const product = getProduct(item.productId);
                if (!product) return null;
                return (
                  <div key={item.productId} className="flex gap-3 p-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${product.gradient} rounded-xl flex-shrink-0 flex items-center justify-center shadow-md`}>
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                          {product.name}
                        </p>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 rounded transition-colors flex-shrink-0"
                          aria-label={`Xóa ${product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(product.price)} / slot</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-gradient">
                          {formatCurrency(product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tổng cộng</span>
              <span className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(total)}</span>
            </div>

            {/* Balance info */}
            {user && (
              <div className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm ${
                canAfford
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20'
                  : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
              }`}>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Wallet className={`w-4 h-4 ${canAfford ? 'text-emerald-500' : 'text-red-500'}`} />
                  Số dư khả dụng
                </span>
                {canAfford ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(balance)}đ</span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-red-500 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Không đủ — cần thêm {formatNumber(total - balance)}đ
                  </span>
                )}
              </div>
            )}

            <button
              onClick={confirming ? handlePayWithBalance : () => setConfirmedTotal(total)}
              disabled={!user || !canAfford || justPaid}
              className={`w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl transition-all ${
                justPaid
                  ? 'bg-emerald-500 text-white'
                  : !user || !canAfford
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : confirming
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {justPaid ? (
                <>
                  <Check className="w-4 h-4" /> Đã thanh toán
                </>
              ) : confirming ? (
                <>
                  <Check className="w-4 h-4" /> Xác nhận thanh toán {formatCurrency(total)}
                </>
              ) : (
                <>
                  Thanh toán
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {confirming && (
              <button
                onClick={() => setConfirmedTotal(null)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Hủy xác nhận
              </button>
            )}
            <button
              onClick={clearCart}
              className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Xóa toàn bộ giỏ hàng
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
