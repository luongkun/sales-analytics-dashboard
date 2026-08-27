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
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { monthlyRevenue, categoryRevenue, regionRevenue, formatCurrency, formatNumber } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';
import { ExportButton } from '../components/ExportButton';

const RevenuePage = () => {
  return (
    <div className="space-y-6">
      <AnimatedSection delay={0.1}>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Phân tích Doanh thu</h1>
      </AnimatedSection>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedSection delay={0.2} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng doanh thu năm</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">5.3 tỷ</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.3} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Doanh thu trung bình/tháng</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">441.8 triệu</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.4} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tháng cao nhất</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">T12: 698 triệu</h3>
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* Main Chart */}
      <AnimatedSection delay={0.5} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Biểu đồ doanh thu theo tháng</h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="month" stroke="#9ca3af" />
<YAxis stroke="#9ca3af" tickFormatter={(val) => val === undefined ? '' : formatCurrency(val as number)} />
<Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </AnimatedSection>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedSection delay={0.6} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Cơ cấu theo danh mục</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryRevenue}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
<Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.7} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Doanh thu theo khu vực</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
<XAxis dataKey="region" stroke="#9ca3af" />
<YAxis stroke="#9ca3af" tickFormatter={(val) => val === undefined ? '' : formatCurrency(val as number)} />
<Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
                <Bar dataKey="q1" name="Quý 1" fill="#3b82f6" />
                <Bar dataKey="q2" name="Quý 2" fill="#10b981" />
                <Bar dataKey="q3" name="Quý 3" fill="#f59e0b" />
                <Bar dataKey="q4" name="Quý 4" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>
      </div>

      {/* Table */}
      <AnimatedSection delay={0.8} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Chi tiết doanh thu theo tháng</h2>
          <ExportButton
            data={monthlyRevenue}
            filename="doanh-thu-theo-thang.csv"
            columns={[
              { key: 'month', label: 'Tháng' },
              { key: 'revenue', label: 'Doanh thu', format: (v) => formatCurrency(v as number) },
              { key: 'orders', label: 'Đơn hàng', format: (v) => formatNumber(v as number) },
              { key: 'customers', label: 'Khách hàng', format: (v) => formatNumber(v as number) },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <th className="pb-3 font-medium">Tháng</th>
                <th className="pb-3 font-medium">Doanh thu</th>
                <th className="pb-3 font-medium">Đơn hàng</th>
                <th className="pb-3 font-medium">Khách hàng</th>
                <th className="pb-3 font-medium">Doanh thu TB/đơn</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                  <td className="py-3">{row.month}</td>
                  <td className="py-3 font-medium">{formatCurrency(row.revenue)}</td>
                  <td className="py-3">{formatNumber(row.orders)}</td>
                  <td className="py-3">{formatNumber(row.customers)}</td>
                  <td className="py-3">{formatCurrency(row.revenue / row.orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default RevenuePage;