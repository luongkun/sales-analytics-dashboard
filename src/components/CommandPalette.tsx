import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  LayoutDashboard,
  BarChart3,
  Rocket,
  ShieldCheck,
  Headset,
  Bot,
  ScrollText,
  Sun,
  Moon,
  LogOut,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { formatCurrency } from '../data/salesData';
import { products, remainingSlots } from '../data/products';
import { useAnalytics } from '../hooks/useAnalytics';

export interface PalettePage {
  id: string;
  label: string;
}

export interface PaletteActions {
  toggleTheme: () => void;
  openCart: () => void;
  logout: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (pageId: string) => void;
  pages: PalettePage[];
  actions: PaletteActions;
  isDarkMode: boolean;
  cartCount: number;
}

interface PaletteItem {
  id: string;
  groupKey: 'navigation' | 'orders' | 'products' | 'customers' | 'actions';
  icon: LucideIcon;
  iconClass: string;
  title: string;
  subtitle?: string;
  keywords: string;
  onSelect: () => void;
}

/** Bỏ dấu tiếng Việt + lowercase để tìm kiếm "thoai mai" */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const PAGE_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  revenue: BarChart3,
  orders: ShoppingCart,
  products: Package,
  customers: Users,
  reports: TrendingUp,
  upgrades: Rocket,
  admin: ShieldCheck,
  support: Headset,
  aichat: Bot,
  policy: ScrollText,
};

const MAX_PER_GROUP = 5;

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  pages,
  actions,
  isDarkMode,
  cartCount,
}: CommandPaletteProps) {
  const { t } = useI18n();
  const { data: analytics } = useAnalytics();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset mỗi lần mở
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // focus sau khi panel gắn vào DOM
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const allItems: PaletteItem[] = useMemo(() => {
    const navItems: PaletteItem[] = pages.map((p) => ({
      id: `nav-${p.id}`,
      groupKey: 'navigation',
      icon: PAGE_ICONS[p.id] || LayoutDashboard,
      iconClass: 'text-blue-500',
      title: p.label,
      keywords: normalize(`${p.label} ${p.id} page ${p.id === 'admin' ? 'quan tri user' : ''} ${p.id === 'support' ? 'ho tro lien he contact' : ''} ${p.id === 'aichat' ? 'chatbot lumi ai tro ly chat' : ''} ${p.id === 'policy' ? 'chinh sach dieu khoan policy terms' : ''}`),
      onSelect: () => onNavigate(p.id),
    }));

    const orderItems: PaletteItem[] = (analytics?.recentOrders ?? []).map((o) => ({
      id: `order-${o.id}`,
      groupKey: 'orders',
      icon: ShoppingCart,
      iconClass: 'text-purple-500',
      title: `${o.id} — ${o.customer}`,
      subtitle: `${o.product} · ${formatCurrency(o.amount)} · ${o.status}`,
      keywords: normalize(`don hang ${o.id} ${o.customer} ${o.product} ${o.status}`),
      onSelect: () => onNavigate('orders'),
    }));

    const productItems: PaletteItem[] = products.map((p) => ({
      id: `product-${p.id}`,
      groupKey: 'products',
      icon: Package,
      iconClass: 'text-emerald-500',
      title: p.name,
      subtitle: `${formatCurrency(p.price)} · ${t('palette.slots_left', { count: remainingSlots(p) })}`,
      keywords: normalize(`san pham ${p.name} ${p.id} ${p.description}`),
      onSelect: () => onNavigate('products'),
    }));

    const customerItems: PaletteItem[] = (analytics?.topCustomers ?? []).map((c) => ({
      id: `customer-${c.email}`,
      groupKey: 'customers',
      icon: Users,
      iconClass: 'text-orange-500',
      title: c.name,
      subtitle: `${c.email} · ${c.orders} ${t('palette.orders_unit')} · ${formatCurrency(c.totalSpent)}`,
      keywords: normalize(`khach hang ${c.name} ${c.email}`),
      onSelect: () => onNavigate('customers'),
    }));

    const actionItems: PaletteItem[] = [
      {
        id: 'action-theme',
        groupKey: 'actions',
        icon: isDarkMode ? Sun : Moon,
        iconClass: 'text-amber-500',
        title: t('palette.action.theme'),
        keywords: normalize(`${t('palette.action.theme')} theme dark light giao dien sang toi`),
        onSelect: actions.toggleTheme,
      },
      {
        id: 'action-cart',
        groupKey: 'actions',
        icon: ShoppingCart,
        iconClass: 'text-blue-500',
        title: t('palette.action.cart'),
        subtitle: cartCount > 0 ? t('palette.cart_items', { count: cartCount }) : undefined,
        keywords: normalize(`${t('palette.action.cart')} cart gio hang`),
        onSelect: actions.openCart,
      },
      {
        id: 'action-logout',
        groupKey: 'actions',
        icon: LogOut,
        iconClass: 'text-red-500',
        title: t('palette.action.logout'),
        keywords: normalize(`${t('palette.action.logout')} logout dang xuat thoat`),
        onSelect: actions.logout,
      },
    ];

    return [...navItems, ...orderItems, ...productItems, ...customerItems, ...actionItems];
  }, [pages, isDarkMode, cartCount, actions, onNavigate, t, analytics]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) {
      // mặc định: điều hướng + hành động (đơn/sản phẩm hiện khi gõ chữ)
      return allItems.filter((i) => i.groupKey === 'navigation' || i.groupKey === 'actions');
    }
    const tokens = q.split(/\s+/);
    return allItems.filter((item) => {
      const hay = `${item.title} ${item.subtitle || ''} ${item.keywords}`;
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [query, allItems]);

  // Giới hạn mỗi nhóm để danh sách gọn
  const grouped = useMemo(() => {
    const counts = new Map<string, number>();
    return filtered.filter((item) => {
      const c = counts.get(item.groupKey) || 0;
      if (c >= MAX_PER_GROUP) return false;
      counts.set(item.groupKey, c + 1);
      return true;
    });
  }, [filtered]);

  const flat = grouped;

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(flat.length - 1, 0)));
  }, [flat.length]);

  // scroll item active vào tầm nhìn
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const runItem = (item: PaletteItem) => {
    onClose();
    // để overlay đóng xong rồi mới chuyển trang (tránh khựng animation)
    setTimeout(() => item.onSelect(), 30);
  };

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) runItem(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const groupOrder: Array<{ key: PaletteItem['groupKey']; label: string }> = [
    { key: 'navigation', label: t('palette.navigation') },
    { key: 'orders', label: t('palette.orders') },
    { key: 'products', label: t('palette.products') },
    { key: 'customers', label: t('palette.customers') },
    { key: 'actions', label: t('palette.actions') },
  ];

  let renderIdx = -1;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('palette.open_label')}
    >
      <div className="mx-auto mt-[8vh] sm:mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden animate-pop-in">
        {/* Ô tìm kiếm */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-700/60">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKey}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.placeholder')}
            className="flex-1 bg-transparent py-3.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kết quả */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {flat.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('palette.no_results', { query: query.trim() })}
              </p>
            </div>
          ) : (
            groupOrder.map(({ key, label }) => {
              const items = flat.filter((i) => i.groupKey === key);
              if (items.length === 0) return null;
              return (
                <div key={key} className="mb-1">
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {label}
                  </p>
                  {items.map((item) => {
                    renderIdx += 1;
                    const idx = renderIdx;
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        data-idx={idx}
                        role="option"
                        aria-selected={active}
                        onMouseMove={() => setActiveIndex(idx)}
                        onClick={() => runItem(item)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-500/15'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? '' : item.iconClass}`} />
                        <span className="flex-1 min-w-0">
                          <span
                            className={`block text-sm font-medium truncate ${
                              active
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                        {active && <CornerDownLeft className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Gợi ý phím */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/60">
          <span className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 font-sans">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
            </kbd>
            {t('palette.hint.move')}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 font-sans">↵</kbd>
            {t('palette.hint.select')}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 font-sans">esc</kbd>
            {t('palette.hint.close')}
          </span>
          <span className="ml-auto hidden sm:inline opacity-70">⌘/Ctrl + K</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
