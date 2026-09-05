import { useState, useEffect, useRef, ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import Avatar from './Avatar';
import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart,
  Users,
  TrendingUp,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Package,
  PackageCheck,
  LogOut,
  ChevronDown,
  Wallet,
  Wrench,
  Inbox,
  Rocket,
  UserPen,
  CirclePlus,
  Check,
  Languages,
  Crown,
} from 'lucide-react';
import CartDrawer from './CartDrawer';
import LiveSyncLabel from './LiveSyncLabel';
import CommandPalette from './CommandPalette';
import { useNotifications } from '../context/NotificationContext';
import { getVipInfo } from '../utils/vip';
import { setAppTitle } from '../utils/setTitle';
import { Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatNumber } from '../data/salesData';
import { TOOLS } from '../data/tools';

/** Nội dung danh sách công cụ (dùng chung cho dropdown + flyout khi thu gọn) */
function ToolsList({ onNavigate }: { onNavigate?: (pageId: string) => void }) {
  if (TOOLS.length === 0) {
    return (
      <div className="px-3 py-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/40">
        <div className="flex items-center gap-2">
          <Inbox className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Chưa có công cụ</p>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
          Danh sách công cụ sẽ được bổ sung sau
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      {TOOLS.map((tool) => {
        const ToolIcon = tool.icon ?? Wrench;
        return (
          <button
            key={tool.id}
            onClick={() => {
              // Điều hướng tới trang công cụ (nếu có) — vd Hỗ trợ → /support
              if (tool.pageId) onNavigate?.(tool.pageId);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white transition-colors"
            title={tool.description}
          >
            <ToolIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="truncate flex-1 text-left">{tool.name}</span>
            {tool.badge && (
              <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                {tool.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const languages: { value: 'vi' | 'en'; label: string; flag: string }[] = [
    { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`p-2 rounded-lg transition-colors ${
          open
            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
        aria-label="Ngôn ngữ"
        aria-expanded={open}
      >
        <Languages className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in"
          role="menu"
        >
          <div className="p-1.5">
            {languages.map((lang) => {
              const active = locale === lang.value;
              return (
                <button
                  key={lang.value}
                  onClick={() => {
                    setLocale(lang.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  role="menuitem"
                >
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.label}</span>
                  {active && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function UserMenu({ onNavigate }: { onNavigate: (pageId: PageId) => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 group"
        aria-label="Tài khoản"
        aria-expanded={open}
      >
        <Avatar user={user} size="sm" />
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in"
          role="menu"
        >
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Avatar user={user} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{user.name}</p>
                      {user.purchasedUpgrades?.includes('UP-01') && (
                        <span
                          className="pro-badge flex-shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white shadow-md shadow-purple-500/40"
                          style={{
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #4a1d96 50%, #7c3aed 100%)',
                          }}
                        >
                          pro
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <span className="inline-block mt-2.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  {user.role === 'admin' ? '⚡ Quản trị viên' : 'Thành viên'}
                </span>
                {/* Hạng VIP theo tổng tiền đã nạp */}
                {(() => {
                  const vip = getVipInfo(user.totalTopup ?? 0, user.vipOverride);
                  const noTier = 'border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-400/10 to-gray-300/5 dark:from-gray-500/10 dark:to-gray-400/5';
                  return (
                    <div className={`mt-2.5 rounded-lg border bg-gradient-to-r px-3 py-2 ${vip.tier ? vip.tier.soft : noTier}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Crown className={`w-3.5 h-3.5 flex-shrink-0 ${vip.tier ? vip.tier.crown : 'text-gray-400'}`} />
                          {vip.tier ? (
                            <span className={`text-[11px] font-bold truncate ${vip.tier.text}`}>
                              VIP {vip.tier.level} · {vip.tier.name}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Chưa có hạng VIP</span>
                          )}
                        </span>
                        {vip.tier && (
                          <span className={`text-[10px] font-bold whitespace-nowrap ${vip.tier.crown}`}>
                            +{vip.tier.bonusPct}%
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" role="progressbar" aria-valuenow={vip.progressPct} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${vip.tier ? vip.tier.bar : 'from-gray-400 to-gray-300'}`}
                          style={{ width: `${vip.progressPct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {vip.nextTier
                          ? `Nạp thêm ${formatNumber(vip.remaining)}đ → VIP ${vip.nextTier.level} · ${vip.nextTier.name}`
                          : 'Đã đạt hạng cao nhất 👑'}
                      </p>
                    </div>
                  );
                })()}
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-400/10 dark:to-teal-400/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Số dư</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatNumber(user.balance)}đ
                  </span>
                </div>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => {
                    setOpen(false);
                    onNavigate('topup');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-semibold rounded-lg transition-colors"
                  role="menuitem"
                >
                  <CirclePlus className="w-4 h-4" />
                  Nạp số dư
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    onNavigate('myorders');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                  role="menuitem"
                >
                  <PackageCheck className="w-4 h-4" />
                  Đơn hàng đã mua
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    onNavigate('profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                  role="menuitem"
                >
                  <UserPen className="w-4 h-4" />
                  Tùy chỉnh hồ sơ
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
    </div>
  );
}

const pageTitles: Record<string, string> = {
  overview: 'Dashboard Phân tích Doanh thu',
  revenue: 'Phân tích Doanh thu',
  orders: 'Quản lý Đơn hàng',
  products: 'Sản phẩm & Gói dịch vụ',
  checkout: 'Thanh toán',
  myorders: 'Đơn hàng đã mua',
  customers: 'Phân tích Khách hàng',
  reports: 'Báo cáo & KPI',
  upgrades: 'Nâng cấp',
  profile: 'Hồ sơ cá nhân',
  topup: 'Nạp số dư',
  admin: 'Quản trị người dùng',
  support: 'Hỗ trợ & Liên hệ',
  aichat: 'Trợ lý AI Lumi',
  policy: 'Chính sách & Điều khoản',
};

type PageId = 'overview' | 'revenue' | 'orders' | 'customers' | 'reports' | 'products' | 'checkout' | 'myorders' | 'upgrades' | 'profile' | 'topup' | 'admin' | 'support' | 'aichat' | 'policy';

interface NavItem {
  id: PageId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface LayoutProps {
  children: ReactNode;
  activePage: PageId;
  onNavigate: (pageId: PageId) => void;
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { itemCount, isCartOpen, openCart, closeCart } = useCart();
  const { unreadCount } = useNotifications();
  const isCheckout = activePage === 'checkout';

  // ⌘/Ctrl + K mở command palette
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Tiêu đề tab động + badge số thông báo chưa đọc
  useEffect(() => {
    const pageTitle = pageTitles[activePage] || 'Dashboard';
    setAppTitle(
      unreadCount > 0
        ? `(${unreadCount}) ${pageTitle} · Sales Suite Pro`
        : `${pageTitle} · Sales Suite Pro`
    );
  }, [activePage, unreadCount]);

  const paletteActions = {
    toggleTheme,
    openCart,
    logout,
  };

  useEffect(() => {
    if (!isCheckout) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onNavigate('products');
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckout]);

  const handleNavClick = (pageId: PageId) => {
    onNavigate(pageId);
    setSidebarOpen(false);
    setToolsOpen(false);
  };

  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';

  const navItems: NavItem[] = [
    { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'revenue', icon: BarChart3, label: 'Doanh thu' },
    { id: 'orders', icon: ShoppingCart, label: 'Đơn hàng' },
    { id: 'products', icon: Package, label: 'Sản phẩm' },
    { id: 'customers', icon: Users, label: 'Khách hàng' },
    { id: 'reports', icon: TrendingUp, label: 'Báo cáo' },
    { id: 'upgrades', icon: Rocket, label: 'Nâng cấp' },
    ...(user?.role === 'admin' ? [{ id: 'admin' as PageId, icon: Users, label: 'Quản trị' }] : []),
  ];

  return (
    <div className="app-bg h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 flex overflow-hidden">
      <a href="#main-content" className="skip-link">
        Chuyển đến nội dung chính
      </a>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 ${sidebarWidth} lg:h-[calc(100%-1.5rem)] lg:my-3 lg:ml-3 lg:rounded-3xl bg-white/95 lg:bg-white/60 dark:bg-gray-800/95 lg:dark:bg-gray-800/50 backdrop-blur-2xl border-r border-gray-200 dark:border-gray-700 lg:border lg:border-white/70 lg:dark:border-white/10 lg:shadow-2xl lg:shadow-indigo-500/10 dark:lg:shadow-black/40 transform transition-all duration-200 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200/70 dark:border-gray-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/40">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <span className="font-bold text-lg text-gray-800 dark:text-white truncate leading-tight block">Analytics</span>
                <span className="text-[10px] font-medium text-gradient leading-tight block">Sales Suite Pro</span>
              </div>
            )}
          </div>
          {/* Mobile: đóng drawer — icon duy nhất trên mobile */}
          <button
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Desktop: thu gọn/mở rộng — icon duy nhất trên desktop */}
          {!sidebarCollapsed && (
            <button
              className="hidden lg:flex p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Thu gọn thanh bên"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {sidebarCollapsed && (
            <button
              className="hidden lg:flex p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Mở rộng thanh bên"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mt-6 px-3 pb-3 flex-1 min-h-0 flex flex-col">
        <nav className="space-y-1 overflow-y-auto flex-1 min-h-0">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-400/15 dark:to-indigo-400/10 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                )}
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

          {/* Nhóm Công cụ — bấm để thả xuống danh sách công cụ (công cụ sẽ được up sau) */}
          <div className="relative pt-3 mt-3 border-t border-gray-200/70 dark:border-gray-700/60">
            <button
              onClick={() => setToolsOpen((o) => !o)}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
              aria-label="Công cụ"
              title={sidebarCollapsed ? 'Công cụ' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                toolsOpen
                  ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-400/15 dark:to-indigo-400/10 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-white'
              }`}
            >
              <Wrench
                className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  toolsOpen ? 'text-blue-600 dark:text-blue-400' : ''
                }`}
              />
              {!sidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">Công cụ</span>
                  {TOOLS.length > 0 && (
                    <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      {TOOLS.length}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      toolsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
            </button>

            {/* Thả xuống inline khi sidebar mở rộng */}
            {!sidebarCollapsed && toolsOpen && (
              <div className="mt-1 px-0.5 max-h-72 overflow-y-auto animate-fade-in" role="menu">
                <ToolsList onNavigate={(id) => handleNavClick(id as PageId)} />
              </div>
            )}

            {/* Flyout bên phải khi sidebar thu gọn (desktop) — neo đáy, mở hướng lên */}
            {sidebarCollapsed && toolsOpen && (
              <div
                className="hidden lg:block absolute left-full bottom-0 ml-3 w-56 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 animate-fade-in max-h-80 overflow-y-auto"
                role="menu"
              >
                <p className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Công cụ
                </p>
                <ToolsList onNavigate={(id) => handleNavClick(id as PageId)} />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex-shrink-0 z-30 pt-3 lg:pr-3">
          <div className="h-16 mx-4 lg:ml-6 lg:mr-0 rounded-2xl bg-white/60 dark:bg-gray-800/50 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-lg shadow-gray-200/50 dark:shadow-black/30 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                {pageTitles[activePage] || 'Dashboard'}
              </h1>
              <LiveSyncLabel />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isCheckout && (
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden sm:flex items-center gap-2 pl-3 pr-2 py-2 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-gray-100/60 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Tìm kiếm nhanh (Ctrl+K)"
                title="Tìm kiếm nhanh (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline">Tìm nhanh...</span>
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-sans rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400">
                  Ctrl K
                </kbd>
              </button>
            )}
            {!isCheckout && (
              <button
                onClick={() => setPaletteOpen(true)}
                className="sm:hidden relative p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Tìm kiếm nhanh"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            {!isCheckout && (
              <button
                onClick={openCart}
                className="relative p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Giỏ hàng"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md shadow-indigo-500/40">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>
            )}
            <NotificationBell onNavigate={(page) => onNavigate(page as PageId)} />
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <LanguageSwitcher />
            <UserMenu onNavigate={onNavigate} />
          </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div key={activePage} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={closeCart}
        onCheckout={() => onNavigate('checkout')}
        onBrowseProducts={() => onNavigate('products')}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(pageId) => onNavigate(pageId as PageId)}
        pages={[
          ...navItems.map((n) => ({ id: n.id, label: n.label })),
          ...TOOLS.filter((t) => t.pageId).map((t) => ({
            id: t.pageId as string,
            label: t.name,
          })),
        ]}
        actions={paletteActions}
        isDarkMode={isDarkMode}
        cartCount={itemCount}
      />
    </div>
  );
}