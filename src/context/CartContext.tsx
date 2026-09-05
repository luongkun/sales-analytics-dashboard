import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { products, Product } from '../data/products';

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (productId: string, quantity?: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getProduct: (productId: string) => Product | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'cart-items';

function loadInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as CartItem[];
    return parsed.filter((item) => products.some((p) => p.id === item.productId));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const getProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    []
  );

  const addToCart = useCallback(
    (productId: string, quantity = 1): boolean => {
      const product = products.find((p) => p.id === productId);
      if (!product) return false;
      const remaining = product.totalSlots - product.bookedSlots;
      let success = false;

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        const currentQty = existing?.quantity ?? 0;
        if (currentQty + quantity > remaining) return prev;
        success = true;
        if (existing) {
          return prev.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [...prev, { productId, quantity }];
      });
      return success;
    },
    []
  );

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const remaining = product.totalSlots - product.bookedSlots;
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, remaining) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const { itemCount, total } = useMemo(() => {
    let count = 0;
    let sum = 0;
    items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        count += item.quantity;
        sum += product.price * item.quantity;
      }
    });
    return { itemCount: count, total: sum };
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, itemCount, total, isCartOpen, openCart, closeCart, addToCart, removeFromCart, updateQuantity, clearCart, getProduct }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
