import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { OrderItem, Product } from '../lib/types';
import { useProducts } from './ProductsContext';

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (productId: string, qty?: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  getProduct: (id: string) => Product | undefined;
}

const CartContext = createContext<CartValue | undefined>(undefined);
const CART_KEY = 'cart-items';

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, getProduct: getProductDef } = useProducts();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (Array.isArray(raw)) return raw.filter((x: any) => x?.productId && typeof x.quantity === 'number');
    } catch {
      /* ignore */
    }
    return [];
  });
  const [isCartOpen, setCartOpen] = useState(false);

  // React 18+ async updater fix: mirror qua ref
  const itemsRef = useRef<CartItem[]>(items);
  useEffect(() => {
    itemsRef.current = items;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CART_KEY) return;
      try {
        const raw = JSON.parse(e.newValue || '[]');
        if (Array.isArray(raw)) setItems(raw.filter((x: any) => x?.productId));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Prune giỏ khi products tải về (bỏ sản phẩm không còn)
  useEffect(() => {
    if (!products.length) return;
    const ids = new Set(products.map((p) => p.id));
    setItems((cur) => {
      const pruned = cur.filter((i) => ids.has(i.productId));
      return pruned.length === cur.length ? cur : pruned;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const addToCart = useCallback(
    (productId: string, qty = 1): boolean => {
      const product = getProductDef(productId);
      if (!product) return false;
      const remaining = product.totalSlots - product.bookedSlots;
      const cur = itemsRef.current.find((i) => i.productId === productId);
      const already = cur?.quantity ?? 0;
      if (already + qty > remaining) return false;
      setItems((cur2) => {
        const existing = cur2.find((i) => i.productId === productId);
        if (existing) {
          return cur2.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + qty } : i));
        }
        return [...cur2, { productId, quantity: qty }];
      });
      return true;
    },
    [getProductDef],
  );

  const removeFromCart = useCallback((productId: string) => {
    setItems((cur) => cur.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback(
    (productId: string, qty: number) => {
      const product = getProductDef(productId);
      const remaining = product ? product.totalSlots - product.bookedSlots : 0;
      if (qty <= 0) {
        removeFromCart(productId);
        return;
      }
      const clamped = Math.min(qty, Math.max(remaining, 0));
      setItems((cur) => cur.map((i) => (i.productId === productId ? { ...i, quantity: clamped } : i)));
    },
    [getProductDef, removeFromCart],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => {
    const p = getProductDef(i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);

  const value: CartValue = {
    items,
    itemCount,
    total,
    isCartOpen,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getProduct: getProductDef,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

/** Chuẩn bị payload đơn từ giỏ */
export function cartToOrderItems(items: CartItem[], getProduct: (id: string) => Product | undefined): OrderItem[] {
  return items
    .map((i) => {
      const p = getProduct(i.productId);
      if (!p) return null;
      return { productId: p.id, name: p.name, quantity: i.quantity };
    })
    .filter((x): x is OrderItem => !!x);
}
