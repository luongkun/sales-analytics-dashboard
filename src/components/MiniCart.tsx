import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatVND } from '../lib/formatters';
import type { ViewId } from '../lib/types';

export function MiniCart({ setView }: { setView?: (v: ViewId) => void }) {
  const { items, itemCount, total, openCart, getProduct } = useCart();
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <ShoppingCart size={18} className="text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Giỏ hàng</h3>
          <p className="text-xs text-gray-400">{itemCount} slot đã chọn</p>
        </div>
        <span className="ml-auto text-lg font-bold text-gray-900 dark:text-gray-100">{formatVND(total)}đ</span>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Giỏ hàng trống</p>
          <p className="mt-0.5 text-xs text-gray-400">Khám phá các gói dịch vụ và thêm slot bạn cần.</p>
          {setView && (
            <button
              onClick={() => setView('products')}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              Xem sản phẩm
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((i) => {
            const p = getProduct(i.productId);
            if (!p) return null;
            return (
              <div key={i.productId} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold">N</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{i.quantity} slot × {formatVND(p.price)}</p>
                </div>
                <span className="text-sm font-bold text-gradient">{formatVND(p.price * i.quantity)}</span>
              </div>
            );
          })}
          <button
            onClick={openCart}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            Thanh toán giỏ hàng
          </button>
        </div>
      )}
    </div>
  );
}
