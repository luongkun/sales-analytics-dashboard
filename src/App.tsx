import { useState } from 'react';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
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
import RevenuePage from './pages/RevenuePage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import ProductsPage from './pages/ProductsPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import UpgradesPage from './pages/UpgradesPage';
import ProfilePage from './pages/ProfilePage';
import TopUpPage from './pages/TopUpPage';
import AdminPage from './pages/AdminPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  monthlyRevenue,
  categoryRevenue,
  regionRevenue,
  topProducts,
  orderTrend,
  recentOrders,
  summaryStats,
} from './data/salesData';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { I18nProvider } from './context/I18nContext';
import { NotificationProvider } from './context/NotificationContext';

function OverviewPage() {
  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnimatedSection delay={0}>
          <StatCard
            title="Tổng doanh thu"
            value={summaryStats.totalRevenue}
            previousValue={summaryStats.previousRevenue}
            icon={DollarSign}
            format="currency"
            color="blue"
          />
        </AnimatedSection>
        <AnimatedSection delay={100}>
          <StatCard
            title="Tổng đơn hàng"
            value={summaryStats.totalOrders}
            previousValue={summaryStats.previousOrders}
            icon={ShoppingCart}
            format="number"
            color="purple"
          />
        </AnimatedSection>
        <AnimatedSection delay={200}>
          <StatCard
            title="Khách hàng mới"
            value={summaryStats.newCustomers}
            previousValue={summaryStats.previousCustomers}
            icon={Users}
            format="number"
            color="green"
          />
        </AnimatedSection>
        <AnimatedSection delay={300}>
          <StatCard
            title="Tỷ lệ tăng trưởng"
            value={summaryStats.growthRate}
            previousValue={summaryStats.previousGrowthRate}
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
            <RevenueChart data={monthlyRevenue} />
          </div>
          <div>
            <CategoryChart data={categoryRevenue} />
          </div>
        </div>
      </AnimatedSection>

      {/* Region Chart + Order Trend */}
      <AnimatedSection delay={100}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <RegionChart data={regionRevenue} />
          <OrderTrendChart data={orderTrend} />
        </div>
      </AnimatedSection>

      {/* Top Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <AnimatedSection delay={100}>
          <TopProducts data={topProducts} />
        </AnimatedSection>
        <AnimatedSection delay={200}>
          <RecentOrders data={recentOrders} />
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
  const [activePage, setActivePage] = useState<'overview' | 'revenue' | 'orders' | 'customers' | 'reports' | 'products' | 'checkout' | 'upgrades' | 'profile' | 'topup' | 'admin'>('overview');

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