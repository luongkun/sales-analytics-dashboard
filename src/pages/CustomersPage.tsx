import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Users, UserPlus, Heart } from 'lucide-react';
import { formatCurrency, formatNumber } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';
import { SkeletonStatCard, SkeletonChart, SkeletonTable } from '../components/Skeleton';
import { useAnalytics } from '../hooks/useAnalytics';

const CustomersPage = () => {
  const { data, loading } = useAnalytics();

  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart height={380} />
          <SkeletonChart height={380} />
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  if (!data) return null;
  const { monthlyRevenue, acquisition, topCustomers, customerStats } = data;
  const currentMonthLabel = monthlyRevenue[monthlyRevenue.length - 1]?.month ?? '';

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0.1}>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Phân tích Khách hàng</h1>
      </AnimatedSection>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedSection delay={0.2} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng khách hàng</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatNumber(customerStats.total)}</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.3} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <UserPlus size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Khách hàng mới ({currentMonthLabel})</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatNumber(customerStats.newThisMonth)}</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.4} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tỷ lệ quay lại (90 ngày)</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{customerStats.retentionRate.toFixed(1)}%</h3>
            </div>
          </div>
        </AnimatedSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <AnimatedSection delay={0.5} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Khách hàng mua sắm theo tháng</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => [formatNumber(value as number), 'Khách hàng']}
                />
                <Legend />
                <Line type="monotone" dataKey="customers" name="Khách hàng đã mua" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>

        {/* Acquisition Source Chart */}
        <AnimatedSection delay={0.6} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Nguồn khách hàng</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisition} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="source" type="category" stroke="#9ca3af" width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => [formatNumber(value as number), 'Khách hàng']}
                />
                <Bar dataKey="value" name="Khách hàng" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>
      </div>

      {/* Top Customers Table */}
      <AnimatedSection delay={0.7} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Khách hàng chi tiêu cao nhất</h2>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-gray-800">
              <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Tên khách hàng</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium text-right">Tổng chi tiêu</th>
                <th className="pb-3 font-medium text-center">Số đơn hàng</th>
                <th className="pb-3 font-medium text-center">Thành viên từ</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((row) => (
                <tr key={row.rank} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                  <td className="py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${row.rank <= 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 font-medium">{row.name}</td>
                  <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{row.email}</td>
                  <td className="py-3 font-medium text-blue-600 dark:text-blue-400 text-right">{formatCurrency(row.totalSpent)}</td>
                  <td className="py-3 text-center">{formatNumber(row.orders)}</td>
                  <td className="py-3 text-center text-sm">{row.memberSince}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default CustomersPage;
