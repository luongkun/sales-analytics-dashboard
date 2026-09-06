import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, LogOut, Moon, ShoppingCart, Sun, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../lib/analytics';
import { useProducts } from '../context/ProductsContext';
import { stripDiacritics, formatCompact, formatVND } from '../lib/formatters';
import { VIEW_TITLES } from '../data/static';
import type { ViewId } from '../lib/types';

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  icon: any;
  iconColor: string;
  action: () => void;
}

export function CommandPalette({ open, onClose, setView }: { open: boolean; onClose: () => void; setView: (v: ViewId) => void }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const { isDark, toggleTheme } = useTheme();
  const { itemCount, openCart } = useCart();
  const { logout } = useAuth();
  const { data } = useAnalytics();
  const { products } = useProducts();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const navPages: ViewId[] = ['overview', 'revenue', 'orders', 'products', 'customers', 'reports', 'upgrades', 'topup', 'myorders', 'profile', 'support', 'aichat', 'policy'];
    const nav: PaletteItem[] = navPages.map((p) => ({
      id: `nav-${p}`,
      group: 'ĐIỀU HƯỚNG',
      title: VIEW_TITLES[p] || p,
      icon: ArrowRight,
      iconColor: 'text-blue-500',
      action: () => setView(p),
    }));

    const orders: PaletteItem[] = (data?.recentOrders || []).slice(0, 5).map((o) => ({
      id: `ord-${o.id}`,
      group: 'ĐƠN HÀNG',
      title: `${o.id} — ${o.customer}`,
      subtitle: `${o.product} · ${formatCompact(o.amount)} · ${o.status}`,
      icon: ShoppingCart,
      iconColor: 'text-purple-500',
      action: () => setView('orders'),
    }));

    const prods: PaletteItem[] = products.slice(0, 5).map((p) => ({
      id: `prd-${p.id}`,
      group: 'SẢN PHẨM',
      title: p.name,
      subtitle: `${formatVND(p.price)} · còn ${p.totalSlots - p.bookedSlots} suất`,
      icon: ArrowRight,
      iconColor: 'text-emerald-500',
      action: () => setView('products'),
    }));

    const customers: PaletteItem[] = (data?.recentOrders || []).slice(0, 5).map((o) => ({
      id: `cus-${o.customer}`,
      group: 'KHÁCH HÀNG',
      title: o.customer,
      subtitle: `${formatCompact(o.amount)} · ${o.status}`,
      icon: ArrowRight,
      iconColor: 'text-orange-500',
      action: () => setView('customers'),
    }));

    const actions: PaletteItem[] = [
      {
        id: 'act-theme',
        group: 'HÀNH ĐỘNG',
        title: 'Đổi giao diện sáng/tối',
        icon: isDark ? Sun : Moon,
        iconColor: 'text-amber-500',
        action: toggleTheme,
      },
      {
        id: 'act-cart',
        group: 'HÀNH ĐỘNG',
        title: 'Mở giỏ hàng',
        subtitle: `${itemCount} sản phẩm trong giỏ`,
        icon: ShoppingCart,
        iconColor: 'text-blue-500',
        action: openCart,
      },
      {
        id: 'act-logout',
        group: 'HÀNH ĐỘNG',
        title: 'Đăng xuất',
        icon: LogOut,
        iconColor: 'text-rose-500',
        action: logout,
      },
    ];

    if (!query.trim()) return [...nav.slice(0, 5), ...actions];
    const q = stripDiacritics(query).split(/\s+/).filter(Boolean);
    const match = (s: string) => {
      const d = stripDiacritics(s);
      return q.every((token) => d.includes(token));
    };
    const all = [...nav, ...orders, ...prods, ...customers, ...actions];
    return all.filter((it) => match(it.title) || (it.subtitle && match(it.subtitle))).map((it) => ({ ...it, group: it.group }));
  }, [query, data, products, isDark, itemCount, setView, toggleTheme, openCart, logout]);

  // group + limit 5 per group
  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const it of items) {
      if (!map.has(it.group)) map.set(it.group, []);
      if (map.get(it.group)!.length < 5) map.get(it.group)!.push(it);
    }
    return [...map.entries()];
  }, [items]);

  const flat = useMemo(() => grouped.flatMap(([, arr]) => arr), [grouped]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const choose = (idx: number) => {
    const it = flat[idx];
    if (!it) return;
    setTimeout(() => {
      onClose();
      it.action();
    }, 30);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm nhanh"
        className="mx-auto mt-[8vh] sm:mt-[12vh] max-w-xl rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => (i + 1) % Math.max(flat.length, 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) => (i - 1 + flat.length) % Math.max(flat.length, 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                choose(activeIdx);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Tìm trang, đơn hàng, sản phẩm, khách hàng..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400"
          />
        </div>
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto custom-scrollbar py-2">
          {flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Không tìm thấy kết quả cho &quot;{query}&quot;</p>
          ) : (
            grouped.map(([group, arr]) => (
              <div key={group} className="mb-1">
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{group}</p>
                {arr.map((it) => {
                  const idx = flat.indexOf(it);
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      data-idx={idx}
                      onClick={() => choose(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === activeIdx ? 'bg-blue-50 dark:bg-blue-500/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <Icon size={15} className={it.iconColor} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{it.title}</p>
                        {it.subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{it.subtitle}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 font-mono">↑↓</kbd> di chuyển</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 font-mono">↵</kbd> chọn</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 font-mono">esc</kbd> đóng</span>
          </div>
          <span className="text-[10px] text-gray-400">⌘/Ctrl + K</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
