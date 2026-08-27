import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useDateRange, DateRangeProvider } from '../context/DateRangeContext';
import { useI18n } from '../context/I18nContext';
import { DateRangePicker } from '../components/DateRangePicker';
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
  LucideIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ReactNode } from 'react';

interface NavItem {
  id: PageId;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
  { id: 'revenue', icon: BarChart3, label: 'Doanh thu' },
  { id: 'orders', icon: ShoppingCart, label: 'Đơn hàng' },
  { id: 'customers', icon: Users, label: 'Khách hàng' },
  { id: 'reports', icon: TrendingUp, label: 'Báo cáo' },
];

const pageTitles: Record<string, string> = {
  overview: 'Dashboard Phân tích Doanh thu',
  revenue: 'Phân tích Doanh thu',
  orders: 'Quản lý Đơn hàng',
  customers: 'Phân tích Khách hàng',
  reports: 'Báo cáo & KPI',
};

type PageId = 'overview' | 'revenue' | 'orders' | 'customers' | 'reports';

interface LayoutProps {
  children: ReactNode;
  activePage: PageId;
  onNavigate: (pageId: PageId) => void;
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { dateRange, setDateRange } = useDateRange();
  const { locale, setLocale } = useI18n();

  const handleNavClick = (pageId: PageId) => {
    onNavigate(pageId);
    setSidebarOpen(false);
  };

  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';

  return (
    <DateRangeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
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
        className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out transition-width duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-gray-800 dark:text-white truncate">Analytics</span>
            )}
          </div>
          <button
            className={sidebarCollapsed ? 'hidden lg:flex' : 'lg:hidden'}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          {!sidebarCollapsed && (
            <button
              className="lg:flex p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {sidebarCollapsed && (
            <button
              className="lg:flex p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="mt-6 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                activePage === item.id
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="absolute bottom-6 left-3 right-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
              <p className="text-sm font-semibold">Nâng cấp Pro</p>
              <p className="text-xs opacity-80 mt-1">Mở khóa tất cả tính năng phân tích nâng cao</p>
              <button className="mt-3 w-full bg-white text-blue-600 text-xs font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors">
                Nâng cấp ngay
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                {pageTitles[activePage] || 'Dashboard'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dữ liệu cập nhật: Tháng 12, 2025</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DateRangePicker
              onChange={(range) => setDateRange(range)}
              initialRange={dateRange}
            />
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'vi' | 'en')}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Language"
            >
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="en">🇺🇸 English</option>
            </select>
            <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Năm 2025</option>
              <option>Năm 2024</option>
            </select>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">LK</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
    </DateRangeProvider>
  );
}