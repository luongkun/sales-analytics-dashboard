import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Product } from '../lib/types';
import { subscribe } from '../realtime/client';

interface ProductsValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
}

const ProductsContext = createContext<ProductsValue | undefined>(undefined);

const FALLBACK: Product[] = [
  {
    id: 'PRD-NETFLIX',
    name: 'Netflix Trial 30 days',
    description: 'Dùng thử Netflix Premium trọn 30 ngày — 4K Ultra HD, xem trên 4 thiết bị, hủy bất cứ lúc nào.',
    price: 20000,
    totalSlots: 100,
    bookedSlots: 0,
    gradient: 'from-red-600 to-red-800',
    icon: 'netflix',
  },
];

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ products: Product[] }>('/products');
      if (d.products?.length) setProducts(d.products);
    } catch {
      // giữ fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
    const un = subscribe('products:changed', () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => refreshProducts(), 150);
    });
    return () => {
      un();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProduct = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  return (
    <ProductsContext.Provider value={{ products, loading, error, refreshProducts, getProduct }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}
