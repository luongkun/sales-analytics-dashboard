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

function App() {
  return (
    <ThemeProvider>
      <Layout>
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
    </Layout>
    </ThemeProvider>
  );
}

export default App;
