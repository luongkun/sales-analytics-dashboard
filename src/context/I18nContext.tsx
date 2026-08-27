import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

type Locale = 'vi' | 'en';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Locale, Record<string, string>> = {
  vi: {
    // General
    'app.name': 'Analytics Dashboard',
    'app.tagline': 'Phân tích doanh thu thông minh',
    
    // Navigation
    'nav.overview': 'Tổng quan',
    'nav.revenue': 'Doanh thu',
    'nav.orders': 'Đơn hàng',
    'nav.customers': 'Khách hàng',
    'nav.reports': 'Báo cáo',
    
    // Common
    'common.loading': 'Đang tải...',
    'common.error': 'Có lỗi xảy ra',
    'common.retry': 'Thử lại',
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.edit': 'Sửa',
    'common.view': 'Xem',
    'common.search': 'Tìm kiếm',
    'common.filter': 'Bộ lọc',
    'common.export': 'Xuất CSV',
    'common.print': 'In',
    'common.refresh': 'Làm mới',
    'common.clear': 'Xóa',
    'common.apply': 'Áp dụng',
    'common.close': 'Đóng',
    'common.confirm': 'Xác nhận',
    'common.yes': 'Có',
    'common.no': 'Không',
    
    // Time periods
    'time.this_month': 'Tháng này',
    'time.last_month': 'Tháng trước',
    'time.this_quarter': 'Quý này',
    'time.this_year': 'Năm nay',
    'time.custom': 'Tùy chỉnh',
    'time.date_range': 'Khoảng thời gian',
    
    // Dashboard
    'dashboard.title': 'Dashboard Phân tích Doanh thu',
    'dashboard.updated': 'Dữ liệu cập nhật: Tháng 12, 2025',
    
    // Stats
    'stats.total_revenue': 'Tổng doanh thu',
    'stats.total_orders': 'Tổng đơn hàng',
    'stats.new_customers': 'Khách hàng mới',
    'stats.growth_rate': 'Tỷ lệ tăng trưởng',
    'stats.avg_monthly': 'Doanh thu trung bình/tháng',
    'stats.best_month': 'Tháng cao nhất',
    
    // Charts
    'charts.monthly_revenue': 'Doanh thu theo tháng',
    'charts.category_revenue': 'Doanh thu theo danh mục',
    'charts.region_revenue': 'Doanh thu theo khu vực',
    'charts.order_trend': 'Xu hướng đơn hàng',
    'charts.top_products': 'Sản phẩm bán chạy',
    'charts.recent_orders': 'Đơn hàng gần đây',
    'charts.customer_growth': 'Tăng trưởng khách hàng',
    'charts.acquisition_source': 'Nguồn khách hàng',
    'charts.yoy_comparison': 'So sánh doanh thu YoY',
    
    // Tables
    'table.rank': 'Rank',
    'table.product': 'Sản phẩm',
    'table.category': 'Danh mục',
    'table.sold': 'Đã bán',
    'table.revenue': 'Doanh thu',
    'table.order_id': 'Mã ĐH',
    'table.customer': 'Khách Hàng',
    'table.amount': 'Tổng Tiền',
    'table.date': 'Ngày Đặt',
    'table.status': 'Trạng Thái',
    'table.email': 'Email',
    'table.total_spent': 'Tổng chi tiêu',
    'table.orders': 'Số đơn hàng',
    'table.member_since': 'Thành viên từ',
    
    // Orders
    'orders.title': 'Quản lý Đơn hàng',
    'orders.total': 'Tổng đơn hàng',
    'orders.completed': 'Hoàn thành',
    'orders.processing': 'Đang xử lý',
    'orders.cancelled': 'Đã hủy',
    'orders.status_completed': 'Hoàn thành',
    'orders.status_processing': 'Đang xử lý',
    'orders.status_shipping': 'Đang giao',
    'orders.status_cancelled': 'Đã hủy',
    
    // Customers
    'customers.title': 'Phân tích Khách hàng',
    'customers.total': 'Tổng khách hàng',
    'customers.new': 'Khách hàng mới',
    'customers.retention': 'Tỷ lệ giữ chân',
    
    // Reports
    'reports.title': 'Báo cáo & KPI',
    'reports.revenue_vs_target': 'Doanh thu vs Mục tiêu',
    'reports.conversion_rate': 'Tỷ lệ chuyển đổi',
    'reports.avg_order_value': 'Giá trị đơn TB',
    'reports.return_rate': 'Tỷ lệ hoàn trả',
    'reports.available': 'Báo cáo có sẵn',
    'reports.download': 'Xuất báo cáo',
    
    // Upgrade
    'upgrade.title': 'Nâng cấp Pro',
    'upgrade.desc': 'Mở khóa tất cả tính năng phân tích nâng cao',
    'upgrade.button': 'Nâng cấp ngay',
    
    // Settings
    'settings.theme': 'Chủ đề',
    'settings.light': 'Sáng',
    'settings.dark': 'Tối',
    'settings.language': 'Ngôn ngữ',
    'settings.year': 'Năm',
    
    // Toasts
    'toast.export_success': 'Xuất file thành công',
    'toast.export_error': 'Xuất file thất bại',
    'toast.copy_success': 'Đã sao chép',
    'toast.save_success': 'Đã lưu',
    'toast.delete_success': 'Đã xóa',
  },
  en: {
    // General
    'app.name': 'Analytics Dashboard',
    'app.tagline': 'Smart Revenue Analytics',
    
    // Navigation
    'nav.overview': 'Overview',
    'nav.revenue': 'Revenue',
    'nav.orders': 'Orders',
    'nav.customers': 'Customers',
    'nav.reports': 'Reports',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export CSV',
    'common.print': 'Print',
    'common.refresh': 'Refresh',
    'common.clear': 'Clear',
    'common.apply': 'Apply',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Time periods
    'time.this_month': 'This Month',
    'time.last_month': 'Last Month',
    'time.this_quarter': 'This Quarter',
    'time.this_year': 'This Year',
    'time.custom': 'Custom',
    'time.date_range': 'Date Range',
    
    // Dashboard
    'dashboard.title': 'Revenue Analytics Dashboard',
    'dashboard.updated': 'Data updated: December 2025',
    
    // Stats
    'stats.total_revenue': 'Total Revenue',
    'stats.total_orders': 'Total Orders',
    'stats.new_customers': 'New Customers',
    'stats.growth_rate': 'Growth Rate',
    'stats.avg_monthly': 'Avg Monthly Revenue',
    'stats.best_month': 'Best Month',
    
    // Charts
    'charts.monthly_revenue': 'Monthly Revenue',
    'charts.category_revenue': 'Revenue by Category',
    'charts.region_revenue': 'Revenue by Region',
    'charts.order_trend': 'Order Trend',
    'charts.top_products': 'Top Products',
    'charts.recent_orders': 'Recent Orders',
    'charts.customer_growth': 'Customer Growth',
    'charts.acquisition_source': 'Acquisition Source',
    'charts.yoy_comparison': 'YoY Comparison',
    
    // Tables
    'table.rank': 'Rank',
    'table.product': 'Product',
    'table.category': 'Category',
    'table.sold': 'Sold',
    'table.revenue': 'Revenue',
    'table.order_id': 'Order ID',
    'table.customer': 'Customer',
    'table.amount': 'Amount',
    'table.date': 'Date',
    'table.status': 'Status',
    'table.email': 'Email',
    'table.total_spent': 'Total Spent',
    'table.orders': 'Orders',
    'table.member_since': 'Member Since',
    
    // Orders
    'orders.title': 'Order Management',
    'orders.total': 'Total Orders',
    'orders.completed': 'Completed',
    'orders.processing': 'Processing',
    'orders.cancelled': 'Cancelled',
    'orders.status_completed': 'Completed',
    'orders.status_processing': 'Processing',
    'orders.status_shipping': 'Shipping',
    'orders.status_cancelled': 'Cancelled',
    
    // Customers
    'customers.title': 'Customer Analytics',
    'customers.total': 'Total Customers',
    'customers.new': 'New Customers',
    'customers.retention': 'Retention Rate',
    
    // Reports
    'reports.title': 'Reports & KPI',
    'reports.revenue_vs_target': 'Revenue vs Target',
    'reports.conversion_rate': 'Conversion Rate',
    'reports.avg_order_value': 'Avg Order Value',
    'reports.return_rate': 'Return Rate',
    'reports.available': 'Available Reports',
    'reports.download': 'Download Report',
    
    // Upgrade
    'upgrade.title': 'Upgrade Pro',
    'upgrade.desc': 'Unlock all advanced analytics features',
    'upgrade.button': 'Upgrade Now',
    
    // Settings
    'settings.theme': 'Theme',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.language': 'Language',
    'settings.year': 'Year',
    
    // Toasts
    'toast.export_success': 'Export successful',
    'toast.export_error': 'Export failed',
    'toast.copy_success': 'Copied to clipboard',
    'toast.save_success': 'Saved successfully',
    'toast.delete_success': 'Deleted successfully',
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locale') as Locale;
      if (saved) return saved;
      const browserLang = navigator.language.startsWith('vi') ? 'vi' : 'en';
      return browserLang;
    }
    return 'vi';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let translation = translations[locale][key] || key;
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          translation = translation.replace(`{${param}}`, String(value));
        });
      }
      return translation;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}