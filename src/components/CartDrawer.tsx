import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ShoppingCart, Trash2, Wallet, X, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useProducts } from '../context/ProductsContext';
import { formatVND } from '../lib/formatters';
import { cartToOrderItems } from '../context/CartContext';
import type { ViewId } from '../lib/types';

export function CartDrawer({ onCheckout, onBrowseProducts }: { onCheckout: () => void; onBrowseProducts: () => void }) {
  const { items, itemCount, total, isCartOpen, closeCart, updateQuantity, removeFromCart, clearCart, getProduct } = useCart();
  const { user, placeOrder } = useAuth();
  const { refreshProducts } = useProducts();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!isCartOpen) return null;

  const balance = user?.balance ?? 0;
  const enough = balance >= total;
  const need = total - balance;

  const doPlaceOrder = async () => {
    if (processing) return;
    setProcessing(true);
    const orderItems = cartToOrderItems(items, getProduct);
    const res = await placeOrder(orderItems, total);
    setProcessing(false);
    if (res.ok) {
      setPaid(true);
      refreshProducts();
      toast.showToast({
        type: 'success',
        title: 'Thanh toán thành công! 🎉',
        message: `Số dư còn ${formatVND(res.balance ?? 0)}đ`,
        duration: 4000,
      });
      setTimeout(() => {
        setPaid(false);
        setConfirming(false);
        clearCart();
        closeCart();
        onCheckout();
      }, 1500);
    } else {
      toast.showToast({ type: 'error', title: 'Thanh toán thất bại', message: res.error });
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={closeCart} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Giỏ hàng"
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShoppingCart size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Giỏ hàng</h2>
            <p className="text-xs text-gray-400">{itemCount} slot đã chọn</p>
          </div>
          <button onClick={closeCart} aria-label="Đóng giỏ hàng" className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <ShoppingCart size={28} className="text-gray-400" />
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Giỏ hàng trống</p>
              <p className="mt-1 text-sm text-gray-400">Khám phá các gói dịch vụ và thêm slot bạn cần.</p>
              <button
                onClick={() => {
                  closeCart();
                  onBrowseProducts();
                }}
                className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Xem sản phẩm
              </button>
            </div>
          ) : (
            items.map((item) => {
              const p = getProduct(item.productId);
              if (!p) return null;
              const remaining = p.totalSlots - p.bookedSlots;
              return (
                <div key={item.productId} className="flex gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <span className="text-white font-bold text-lg">N</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{formatVND(p.price)} / slot</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        aria-label="Giảm số lượng"
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-rose-300 hover:text-rose-500 transition-colors"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        aria-label="Tăng số lượng"
                        disabled={item.quantity >= remaining}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-blue-300 hover:text-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                      <span className="ml-auto text-sm font-bold text-gradient">{formatVND(p.price * item.quantity)}</span>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        aria-label={`Xóa ${p.name}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tổng cộng</span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatVND(total)}đ</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
              <Wallet size={16} className="text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Số dư khả dụng</span>
              {enough ? (
                <span className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatVND(balance)}đ</span>
              ) : (
                <span className="ml-auto text-sm font-bold text-rose-500">Không đủ — cần thêm {formatVND(need)}đ</span>
              )}
            </div>

            {paid ? (
              <div className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-center text-sm flex items-center justify-center gap-2">
                <Check size={16} /> Đã thanh toán
              </div>
            ) : confirming ? (
              <div className="space-y-2">
                <button
                  onClick={doPlaceOrder}
                  disabled={processing || !enough}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    <>✓ Xác nhận thanh toán {formatVND(total)}đ</>
                  )}
                </button>
                <button onClick={() => setConfirming(false)} className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  Hủy xác nhận
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                disabled={!enough}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Thanh toán
              </button>
            )}

            <button onClick={clearCart} className="w-full text-xs text-rose-400 hover:text-rose-600 transition-colors py-1">
              Xóa toàn bộ giỏ hàng
            </button>
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}
