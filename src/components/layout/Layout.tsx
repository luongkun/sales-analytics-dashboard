import { useEffect, useRef, useState } from 'react';
import {
  Bell, ChevronDown, ChevronLeft, CirclePlus, Clock, Crown, FileText, Globe, LayoutDashboard,
  Languages, LogOut, Menu, Moon, Package, RefreshCw, Search, Send, Shield, ShoppingBag,
  ShoppingCart, Sun, TrendingUp, Users, Wallet, Wrench, X, Bot, LifeBuoy, ScrollText, UserPen,
  CircleCheck, CircleX, TriangleAlert, Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nProvider';
import { TOOLS, VIEW_TITLES, tierProgress } from '../../data/static';
import { formatRelative, formatVND, currentMonthLabel } from '../../lib/formatters';
import type { ViewId } from '../../lib/types';
import { Avatar, VipBadge } from '../vip/Avatar';
import { isConnected, subscribe } from '../../realtime/client';

const NAV_ITEMS: { id: ViewId; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
  { id: 'revenue', icon: TrendingUp, label: 'Doanh thu' },
  { id: 'orders', icon: ShoppingBag, label: 'Đơn hàng' },
  { id: 'products', icon: Package, label: 'Sản phẩm' },
  { id: 'customers', icon: Users, label: 'Khách hàng' },
  { id: 'reports', icon: FileText, label: 'Báo cáo' },
  { id: 'upgrades', icon: TrendingUp, label: 'Nâng cấp' },
];

const TOOL_ICONS = { 'life-buoy': LifeBuoy, bot: Bot, 'scroll-text': ScrollText } as const;

interface LayoutProps {
  view: ViewId;
  setView: (v: ViewId) => void;
  children: React.ReactNode;
  onOpenPalette: () => void;
}

export function Layout({ view, setView, children, onOpenPalette }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setMobileOpen(false);
  }, [view]);

  return (
    <div className="app-bg h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 flex overflow-hidden">
      <a href="#main-content" className="skip-link">
        Chuyển đến nội dung chính
      </a>

      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      <Sidebar
        view={view}
        setView={setView}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 relative z-10 flex flex-col h-full">
        <Header view={view} onOpenMobile={() => setMobileOpen(true)} onOpenPalette={onOpenPalette} />
        <main id="main-content" className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ============ SIDEBAR ============ */

function Sidebar({ view, setView, mobileOpen, collapsed, onToggleCollapse, onCloseMobile }: {
  view: ViewId;
  setView: (v: ViewId) => void;
  mobileOpen: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}) {
  const { user, logout } = useAuth();
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <aside
      className={`fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      } lg:h-[calc(100%-1.5rem)] lg:my-3 lg:ml-3 lg:rounded-3xl bg-white/95 lg:bg-white/60 dark:bg-gray-800/95 lg:dark:bg-gray-800/50 backdrop-blur-2xl border-r border-gray-200 dark:border-gray-700 lg:border lg:border-white/70 lg:dark:border-white/10 lg:shadow-2xl lg:shadow-indigo-500/10 dark:lg:shadow-black/40 transform transition-all duration-200 ease-in-out flex flex-col ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/40 flex items-center justify-center flex-shrink-0">
          <img src={brandLogoUrl} alt="Logo Sales Suite Pro" className="w-6 h-6" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <LayoutDashboard className="hidden" size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight">Analytics</p>
            <p className="text-[10px] text-gradient font-semibold">Sales Suite Pro</p>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <button onClick={onCloseMobile} aria-label="Đóng menu" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
        <div className="ml-auto hidden lg:block">
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={18} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-6 px-3 pb-3 flex-1 min-h-0 flex flex-col">
        <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              active={view === item.id}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              onClick={() => setView(item.id)}
            />
          ))}
          {user?.role === 'admin' && (
            <NavButton active={view === 'admin'} icon={Shield} label="Quản trị" collapsed={collapsed} onClick={() => setView('admin')} />
          )}
        </div>

        {/* Tools accordion */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
          {collapsed ? (
            <div className="relative group">
              <button
                aria-label="Công cụ"
                className="w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
              >
                <Wrench size={18} />
              </button>
              <div className="absolute left-full bottom-0 ml-2 w-56 hidden group-hover:block z-50">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-2">
                  {TOOLS.map((tool) => {
                    const TIcon = TOOL_ICONS[tool.icon];
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setView(tool.pageId as ViewId)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-left"
                      >
                        <TIcon size={15} className="text-blue-500 flex-shrink-0" />
                        <span className="truncate">{tool.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                aria-label="Công cụ"
                aria-expanded={toolsOpen}
                onClick={() => setToolsOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Wrench size={18} className="flex-shrink-0" />
                <span>Công cụ</span>
                {TOOLS.some((x) => x.badge) && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-fuchsia-500 text-white">{TOOLS.length}</span>
                )}
                <ChevronDown size={14} className={`transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>
              <p className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Công cụ</p>
              {toolsOpen &&
                TOOLS.map((tool) => {
                  const TIcon = TOOL_ICONS[tool.icon];
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setView(tool.pageId as ViewId)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all relative group ${
                        view === tool.pageId
                          ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <TIcon size={16} className="flex-shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium truncate">{tool.name}</p>
                        {!collapsed && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{tool.description}</p>}
                      </div>
                      {tool.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400">{tool.badge}</span>
                      )}
                    </button>
                  );
                })}
            </>
          )}
        </div>

        {/* Mini user */}
        {!collapsed && user && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2.5 px-2 pb-1">
            <Avatar name={user.name} avatar={user.avatar} size="sm" vip={user.vip} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Đăng xuất"
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex-shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}

function NavButton({ active, icon: Icon, label, collapsed, onClick }: { active: boolean; icon: typeof LayoutDashboard; label: string; collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group ${
        active
          ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-300 shadow-sm'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      {active && <span className="absolute left-0 w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" aria-hidden="true" />}
      <Icon size={18} className={`flex-shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

import brandLogo from '../../assets/brand-logo.svg';
const brandLogoUrl = brandLogo;

/* ============ HEADER ============ */

function Header({ view, onOpenMobile, onOpenPalette }: { view: ViewId; onOpenMobile: () => void; onOpenPalette: () => void }) {
  const { isDark, toggleTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const { itemCount, openCart } = useCart();
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const monthLabel = currentMonthLabel();

  return (
    <div className="flex-shrink-0 z-30 pt-3 lg:pr-3">
      <div className="h-16 mx-4 lg:ml-6 lg:mr-0 rounded-2xl bg-white/60 dark:bg-gray-800/50 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-lg shadow-gray-200/50 dark:shadow-black/30 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onOpenMobile} aria-label="Mở menu" className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{VIEW_TITLES[view] || 'Dashboard'}</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" title="Đồng bộ realtime">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">{t('dashboard.updated', { month: monthLabel })}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate sm:hidden">{t('dashboard.updated_short', { month: monthLabel })}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onOpenPalette}
            aria-label="Tìm kiếm nhanh (Ctrl+K)"
            className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-600 transition-colors"
          >
            <Search size={15} />
            <span className="text-sm">Tìm nhanh...</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 font-mono text-gray-400">Ctrl K</kbd>
          </button>
          <button onClick={onOpenPalette} aria-label="Tìm kiếm nhanh" className="sm:hidden p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Search size={18} />
          </button>

          <button onClick={openCart} aria-label="Giỏ hàng" className="relative p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {itemCount}
              </span>
            )}
          </button>

          <NotificationBell />

          <button onClick={toggleTheme} aria-label="Toggle dark mode" className="p-2 rounded-xl text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
            aria-label="Ngôn ngữ"
            className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Languages size={18} />
          </button>

          <UserMenu />
        </div>
      </div>
    </div>
  );
}

/* ============ NOTIFICATION BELL ============ */

const NOTIF_ICONS = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
};

function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        className="relative p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-fade-in z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Thông báo</p>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{unreadCount} mới</span>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.map((n) => {
              const NIcon = NOTIF_ICONS[n.type];
              const isUnread = unreadCount > 0;
              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${
                    isUnread ? 'bg-blue-50/70 dark:bg-blue-500/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <NIcon
                      size={16}
                      className={`flex-shrink-0 mt-0.5 ${
                        n.type === 'success' ? 'text-emerald-500' : n.type === 'error' ? 'text-rose-500' : n.type === 'warning' ? 'text-amber-500' : 'text-sky-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-snug">{n.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatRelative(n.minutesAgo)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button onClick={markAllAsRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Đánh dấu đã đọc
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ USER MENU ============ */

function UserMenu() {
  const { user, logout } = useAuth();
  const { setView } = useViewNav();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;
  const tp = tierProgress(user.totalTopup);

  const go = (v: ViewId) => {
    setView(v);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Menu người dùng" aria-expanded={open} className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <Avatar name={user.name} avatar={user.avatar} vip={user.vip} />
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-fade-in z-50">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} avatar={user.avatar} vip={user.vip} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'bg-gray-500/10 text-gray-500'}`}>
                {user.role === 'admin' ? '⚡ Quản trị viên' : 'Thành viên'}
              </span>
              <VipBadge vip={user.vip} />
            </div>

            {user.vip && (
              <div className="mt-3 p-3 rounded-xl border border-purple-200/60 dark:border-purple-500/20 bg-gradient-to-r from-purple-500/15 to-fuchsia-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
                    <Crown size={13} />
                    <span className="text-xs font-bold">VIP {user.vip.level} · {user.vip.name}</span>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-300">+{user.vip.bonusPct}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full" style={{ width: `${tp.progressPct}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                  {!tp.next ? 'Đã đạt hạng cao nhất 👑' : `Còn ${formatVND(tp.remaining)}đ lên VIP ${tp.next.level} · ${tp.next.name}`}
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <Wallet size={14} className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatVND(user.balance)}đ</span>
              <span className="text-[10px] text-gray-400">số dư khả dụng</span>
            </div>
          </div>

          <div className="py-1.5">
            <MenuItem icon={CirclePlus} label="Nạp số dư" color="text-emerald-600" bold onClick={() => go('topup')} />
            <MenuItem icon={Package} label="Đơn hàng đã mua" onClick={() => go('myorders')} />
            <MenuItem icon={UserPen} label="Tùy chỉnh hồ sơ" onClick={() => go('profile')} />
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700/50 py-1.5">
            <MenuItem icon={LogOut} label="Đăng xuất" color="text-rose-500" onClick={logout} />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, color = 'text-gray-600 dark:text-gray-300', bold, onClick }: { icon: typeof CirclePlus; label: string; color?: string; bold?: boolean; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <Icon size={16} className={color} />
      <span className={`${color} ${bold ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}

/* View nav context nhẹ cho UserMenu (tránh prop drilling) */
import { createContext, useContext } from 'react';
const ViewNavContext = createContext<{ setView: (v: ViewId) => void }>({ setView: () => {} });
export const ViewNavProvider = ViewNavContext.Provider;
function useViewNav() {
  return useContext(ViewNavContext);
}
