import { Package, ShoppingBag, TrendingUp, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { useAnalytics } from '../lib/analytics';
import { KpiCard } from '../components/KpiCard';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/Skeleton';
import { CategoryDonut, OrderTrendChart, RecentOrders, RegionBars, RevenueChart, TopProducts } from '../components/charts/Charts';
import { MiniCart } from '../components/MiniCart';

export function OverviewPage() {
  const { data, loading, error, refresh } = useAnalytics();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton h={220} />
          <ChartSkeleton h={220} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
        <span className="text-4xl">📡</span>
        <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100">Không tải được dữ liệu phân tích</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={refresh}
          className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const s = data!.summary;
  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Tổng doanh thu" value={s.totalRevenue} previousValue={s.previousRevenue} icon={TrendingUp} color="blue" />
        <KpiCard title="Tổng đơn hàng" value={s.totalOrders} previousValue={s.previousOrders} icon={ShoppingBag} color="green" format="number" suffix=" đơn" />
        <KpiCard title="Khách hàng mới (30 ngày)" value={s.newCustomers} previousValue={s.previousCustomers} icon={UserPlus} color="purple" format="number" />
        <KpiCard title="Tăng trưởng doanh thu" value={s.growthRate} previousValue={s.previousGrowthRate ?? 0} icon={s.growthRate >= 0 ? TrendingUp : TrendingUp} color={s.growthRate >= 0 ? 'amber' : 'rose'} format="number" suffix="%" />
      </div>

      <RevenueChart data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDonut data={data!.categoryRevenue} />
        <RegionBars data={data!.regionRevenue} />
      </div>

      <OrderTrendChart data={data!.orderTrend} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopProducts data={data!.topProducts} />
        <div className="space-y-6">
          <RecentOrders data={data!.recentOrders} />
          <MiniCart />
        </div>
      </div>
    </div>
  );
}
