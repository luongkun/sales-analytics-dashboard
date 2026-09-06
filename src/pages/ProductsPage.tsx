import { useState } from 'react';
import { Check, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import { useToast } from '../context/ToastContext';
import { StaggeredFadeIn } from '../components/Skeleton';
import { MiniCart } from '../components/MiniCart';
import { formatVND } from '../lib/formatters';
import type { Product } from '../lib/types';

export function ProductsPage() {
  const { products, loading } = useProducts();

  return (
    <div className="space-y-6">
      <MiniCart />

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chọn gói phù hợp</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Slot giới hạn cho từng gói, thanh toán qua QR</p>
      </div>

      {loading && products.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((p, t) => (
            <StaggeredFadeIn key={p.id} delay={100 + t * 60}>
              <ProductCard product={p} />
            </StaggeredFadeIn>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addToCart, openCart } = useCart();
  const toast = useToast();
  const [justAdded, setJustAdded] = useState(false);

  const remaining = product.totalSlots - product.bookedSlots;
  const soldOut = remaining <= 0;
  const pct = product.totalSlots > 0 ? Math.round((remaining / product.totalSlots) * 100) : 0;

  const tryAdd = (openAfter: boolean): boolean => {
    if (justAdded) {
      if (openAfter) openCart();
      return true;
    }
    const curQty = 0; // giỏ hiện tại check trong CartContext.addToCart
    if (curQty + 1 > remaining) {
      toast.showToast({
        type: 'warning',
        title: 'Vượt số slot còn lại',
        message: remaining > 0 ? `Chỉ còn ${remaining} slot cho ${product.name}` : `${product.name} đã hết slot`,
        duration: 3000,
      });
      return false;
    }
    const ok = addToCart(product.id, 1);
    if (!ok) {
      toast.showToast({
        type: 'warning',
        title: 'Vượt số slot còn lại',
        message: remaining > 0 ? `Chỉ còn ${remaining} slot cho ${product.name}` : `${product.name} đã hết slot`,
        duration: 3000,
      });
      return false;
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
    if (openAfter) openCart();
    return true;
  };

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col group">
      {/* Header gradient */}
      <div className={`bg-gradient-to-br ${product.gradient} p-5 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-start justify-between relative">
          <div className="w-12 h-12 rounded-xl bg-black shadow-lg shadow-black/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#E50914" aria-hidden="true">
              <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-3.444-9.53-6.419-17.114-9.325-24.998L5.398 0zM15.387.16l4.019 23.273c2.18-.007 4.256-.186 4.256-.186L19.684 0h-4.297zM3.412.398L0 24.434c1.865.096 3.553.06 3.553.06L7.483.404c-1.066-.07-2.75-.095-4.071-.006z" />
            </svg>
          </div>
          <span className="text-xs font-mono text-white/80 bg-white/15 backdrop-blur-sm px-2 py-1 rounded-lg">{product.id}</span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-white relative">{product.name}</h3>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{product.description}</p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">Slot còn lại</span>
            <span className={`font-bold ${soldOut ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {soldOut ? 'Hết slot' : `${remaining} slot`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full ${soldOut ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Giá / slot</span>
          <span className="text-xl font-bold text-gradient">{formatVND(product.price)}</span>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => tryAdd(false)}
            disabled={soldOut}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              justAdded
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'
            }`}
          >
            {justAdded ? (
              <>
                <Check size={15} /> Đã thêm
              </>
            ) : (
              <>
                <Plus size={15} /> Thêm vào giỏ hàng
              </>
            )}
          </button>
          <button
            onClick={() => tryAdd(true)}
            disabled={soldOut}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              soldOut
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            {soldOut ? 'Hết slot' : 'Mua'}
          </button>
        </div>
      </div>
    </div>
  );
}
