import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import Layout from './components/Layout';
import StatCard from './components/StatCard';
import RevenueChart from './components/RevenueChart';
import CategoryChart from './components/CategoryChart';
import RegionChart from './components/RegionChart';
import TopProducts from './components/TopProducts';
import OrderTrendChart from './components/OrderTrendChart';
import {
  monthlyRevenue,
  categoryRevenue,
  regionRevenue,
  topProducts,
  orderTrend,
  summaryStats,
} from './data/salesData';

function App() {
  return (
    <Layout>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Tổng doanh thu"
          value={summaryStats.totalRevenue}
          previousValue={summaryStats.previousRevenue}
          icon={DollarSign}
          format="currency"
          color="blue"
        />
        <StatCard
          title="Tổng đơn hàng"
          value={summaryStats.totalOrders}
          previousValue={summaryStats.previousOrders}
          icon={ShoppingCart}
          format="number"
          color="purple"
        />
        <StatCard
          title="Khách hàng mới"
          value={summaryStats.newCustomers}
          previousValue={summaryStats.previousCustomers}
          icon={Users}
          format="number"
          color="green"
        />
        <StatCard
          title="Tỷ lệ tăng trưởng"
          value={summaryStats.growthRate}
          previousValue={summaryStats.previousGrowthRate}
          icon={TrendingUp}
          format="percent"
          color="orange"
        />
      </div>

      {/* Revenue Chart + Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <RevenueChart data={monthlyRevenue} />
        </div>
        <div>
          <CategoryChart data={categoryRevenue} />
        </div>
      </div>

      {/* Region Chart + Order Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RegionChart data={regionRevenue} />
        <OrderTrendChart data={orderTrend} />
      </div>

      {/* Top Products */}
      <TopProducts data={topProducts} />
    </Layout>
  );
}

export default App;
