import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ShoppingBag, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatNumber } from '../data/salesData';
import RecentOrders from '../components/RecentOrders';
import AnimatedSection from '../components/AnimatedSection';
import { SkeletonStatCard, SkeletonChart } from '../components/Skeleton';
import { useAnalytics } from '../hooks/useAnalytics';

const OrdersPage = () => {
  const { data, loading } = useAnalytics();

  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonChart className="lg:col-span-2" height={340} />
          <SkeletonChart height={340} />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { orderStats, orderStatus, orderTrend, recentOrders } = data;
  const total = orderStats.total || 1;
  const completedPct = ((orderStats.completed / total) * 100).toFixed(1);
  const processingPct = ((orderStats.processing / total) * 100).toFixed(1);
  const canceledPct = ((orderStats.canceled / total) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0.1}>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý Đơn hàng</h1>
      </AnimatedSection>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedSection delay={0.2} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng đơn hàng</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatNumber(orderStats.total)}</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.3} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hoàn thành ({completedPct}%)</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatNumber(orderStats.completed)}</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.4} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Đang xử lý ({processingPct}%)</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatNumber(orderStats.processing)}</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.5} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Đã hủy ({canceledPct}%)</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatNumber(orderStats.canceled)}</h3>
            </div>
          </div>
        </AnimatedSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <AnimatedSection delay={0.6} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Xu hướng đơn hàng</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={orderTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="week" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                <Area type="monotone" dataKey="orders" name="Đơn hàng" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOrders)" />
                <Area type="monotone" dataKey="returns" name="Hoàn trả" stroke="#ef4444" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>

        {/* Status Pie Chart */}
        <AnimatedSection delay={0.7} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Trạng thái đơn hàng</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>
      </div>

      <AnimatedSection delay={0.8}>
        <RecentOrders data={recentOrders} />
      </AnimatedSection>
    </div>
  );
};

export default OrdersPage;
