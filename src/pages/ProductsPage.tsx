import { ShoppingCart, Check } from 'lucide-react';
import { products, remainingSlots, Product } from '../data/products';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';
import { useState, ComponentType } from 'react';

function NetflixIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#E50914"
        d="M5.398 0v24l4.346-1.462v-11.66l3.084 10.735L17.1 20.42V0h-4.34v10.79L9.682 0H5.398z"
      />
    </svg>
  );
}

function FallbackIcon({ className }: { className?: string }) {
  return <ShoppingCart className={className} />;
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  netflix: NetflixIcon,
};
const DEFAULT_ICON: ComponentType<{ className?: string }> = FallbackIcon;

function SlotBadge({ product }: { product: Product }) {
  const remaining = remainingSlots(product);
  const percent = (remaining / product.totalSlots) * 100;
  const low = percent <= 10;
  const medium = percent <= 35 && !low;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            low
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : medium
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          }`}
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>
      <span className={`text-xs font-bold whitespace-nowrap ${
        low ? 'text-red-500' : medium ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
      }`}>
        {remaining > 0 ? `${remaining} slot` : 'Hết slot'}
      </span>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addToCart, openCart } = useCart();
  const { showToast } = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const remaining = remainingSlots(product);
  const Icon = iconMap[product.icon] || DEFAULT_ICON;
  const soldOut = remaining <= 0;

  const handleAdd = () => {
    if (soldOut) return;
    const ok = addToCart(product.id);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    } else {
      showToast({
        type: 'warning',
        title: 'Vượt số slot còn lại',
        message: `Chỉ còn ${remaining} slot cho ${product.name}`,
        duration: 3000,
      });
    }
  };

  const handleBuyNow = () => {
    if (soldOut) return;
    const ok = addToCart(product.id);
    if (ok) {
      openCart();
    } else {
      showToast({
        type: 'warning',
        title: 'Vượt số slot còn lại',
        message: `Chỉ còn ${remaining} slot cho ${product.name}`,
        duration: 3000,
      });
    }
  };

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col group">
      <div className={`bg-gradient-to-br ${product.gradient} p-5 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-start justify-between relative">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
              product.icon === 'netflix' ? 'bg-black shadow-lg shadow-black/40' : 'bg-white/20 backdrop-blur-sm'
            }`}
          >
            <Icon className={product.icon === 'netflix' ? 'w-7 h-7' : 'w-6 h-6 text-white'} />
          </div>
          <span className="text-xs font-mono text-white/80 bg-white/15 backdrop-blur-sm px-2 py-1 rounded-lg">
            {product.id}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mt-3 relative">{product.name}</h3>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{product.description}</p>

        <div className="mt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Slot còn lại</p>
          <SlotBadge product={product} />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Giá / slot</p>
              <p className="text-xl font-bold text-gradient">{formatCurrency(product.price)}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={soldOut}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                soldOut
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : justAdded
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 active:scale-95'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" /> Đã thêm
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" /> Thêm vào giỏ hàng
                </>
              )}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={soldOut}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 whitespace-nowrap ${
                soldOut
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95'
              }`}
            >
              {soldOut ? 'Hết slot' : 'Mua'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ProductsPage = () => {
  return (
    <div className="space-y-6">
      <AnimatedSection delay={0}>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Sản phẩm & Gói dịch vụ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chọn gói phù hợp — slot giới hạn cho từng gói, thanh toán qua QR
          </p>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product, idx) => (
          <AnimatedSection key={product.id} delay={100 + idx * 60}>
            <ProductCard product={product} />
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;
