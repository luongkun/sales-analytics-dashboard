import { useState } from 'react';
import { DollarSign, ShoppingCart, Users, TrendingUp, RefreshCw } from 'lucide-react';
import Layout from './components/Layout';
import StatCard from './components/StatCard';
import RevenueChart from './components/RevenueChart';
import CategoryChart from './components/CategoryChart';
import RegionChart from './components/RegionChart';
import TopProducts from './components/TopProducts';
import OrderTrendChart from './components/OrderTrendChart';
import RecentOrders from './components/RecentOrders';
import AnimatedSection from './components/AnimatedSection';
import ErrorBoundary from './components/ErrorBoundary';
import { SkeletonStatCard, SkeletonChart, SkeletonTable } from './components/Skeleton';
import { fetchDailyRevenue } from './api/analytics';
import { useAnalytics } from './hooks/useAnalytics';
import RevenuePage from './pages/RevenuePage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import ProductsPage from './pages/ProductsPage';
import CheckoutPage from './pages/CheckoutPage';
import MyOrdersPage from './pages/MyOrdersPage';
import LoginPage from './pages/LoginPage';
import UpgradesPage from './pages/UpgradesPage';
import ProfilePage from './pages/ProfilePage';
import TopUpPage from './pages/TopUpPage';
import AdminPage from './pages/AdminPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { I18nProvider } from './context/I18nContext';
import { NotificationProvider } from './context/NotificationContext';

function OverviewPage() {
  const { data, loading, error, refresh } = useAnalytics();

  // Đang tải lần đầu (chưa có cache) → skeleton
  if (loading && !data) {
    return (
      <div aria-busy="true" aria-label="Đang tải dữ liệu phân tích">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <SkeletonChart className="lg:col-span-2" height={360} />
          <SkeletonChart height={360} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SkeletonChart height={320} />
          <SkeletonChart height={320} />
        </div>
        <SkeletonTable rows={6} columns={6} />
      </div>
    );
  }

  // Lỗi & chưa có dữ liệu → màn lỗi nhẹ nhàng + thử lại
  if (error && !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
        <p className="text-5xl mb-4" aria-hidden="true">📡</p>
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Không tải được dữ liệu phân tích</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{error.message}</p>
        <button
          onClick={refresh}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  if (!data) return null;
  const s = data.summary;

  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnimatedSection delay={0}>
          <StatCard
            title="Tổng doanh thu"
            value={s.totalRevenue}
            previousValue={s.previousRevenue}
            icon={DollarSign}
            format="currency"
            color="blue"
          />
        </AnimatedSection>
        <AnimatedSection delay={100}>
          <StatCard
            title="Tổng đơn hàng"
            value={s.totalOrders}
            previousValue={s.previousOrders}
            icon={ShoppingCart}
            format="number"
            color="purple"
          />
        </AnimatedSection>
        <AnimatedSection delay={200}>
          <StatCard
            title="Khách hàng mới (30 ngày)"
            value={s.newCustomers}
            previousValue={s.previousCustomers}
            icon={Users}
            format="number"
            color="green"
          />
        </AnimatedSection>
        <AnimatedSection delay={300}>
          <StatCard
            title="Tăng trưởng doanh thu"
            value={s.growthRate}
            previousValue={s.previousGrowthRate}
            icon={TrendingUp}
            format="percent"
            color="orange"
          />
        </AnimatedSection>
      </div>

      {/* Revenue Chart + Category Chart */}
      <AnimatedSection delay={100}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <RevenueChart data={data.monthlyRevenue} fetchDaily={fetchDailyRevenue} />
          </div>
          <div>
            <CategoryChart data={data.categoryRevenue} />
          </div>
        </div>
      </AnimatedSection>

      {/* Region Chart + Order Trend */}
      <AnimatedSection delay={100}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <RegionChart data={data.regionRevenue} />
          <OrderTrendChart data={data.orderTrend} />
        </div>
      </AnimatedSection>

      {/* Top Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <AnimatedSection delay={100}>
          <TopProducts data={data.topProducts} />
        </AnimatedSection>
        <AnimatedSection delay={200}>
          <RecentOrders data={data.recentOrders} />
        </AnimatedSection>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <I18nProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </I18nProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState<'overview' | 'revenue' | 'orders' | 'customers' | 'reports' | 'products' | 'checkout' | 'myorders' | 'upgrades' | 'profile' | 'topup' | 'admin'>('overview');

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />;
      case 'revenue':
        return <RevenuePage />;
      case 'orders':
        return <OrdersPage />;
      case 'customers':
        return <CustomersPage />;
      case 'reports':
        return <ReportsPage />;
      case 'products':
        return <ProductsPage />;
      case 'checkout':
        return (
          <CheckoutPage
            onBack={() => setActivePage('products')}
            onNavigate={(page) => setActivePage(page)}
          />
        );
      case 'myorders':
        return <MyOrdersPage onNavigate={(page) => setActivePage(page)} />;
      case 'upgrades':
        return <UpgradesPage />;
      case 'profile':
        return <ProfilePage />;
      case 'topup':
        return <TopUpPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <OverviewPage />;
    }
  };

  if (loading) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <CartProvider>
      <NotificationProvider>
        <ErrorBoundary>
            <Layout activePage={activePage} onNavigate={setActivePage}>
              {renderPage()}
            </Layout>
        </ErrorBoundary>
      </NotificationProvider>
    </CartProvider>
  );
}

export default App;