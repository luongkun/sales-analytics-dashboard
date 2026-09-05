import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Target, CheckCircle, DollarSign, RotateCcw, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';
import { SkeletonStatCard, SkeletonChart } from '../components/Skeleton';
import { useAnalytics } from '../hooks/useAnalytics';

interface Report {
  id: number;
  name: string;
  desc: string;
  type: 'pdf' | 'excel';
}

const ReportsPage = () => {
  const { data, loading } = useAnalytics();

  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart height={400} />
          <SkeletonChart height={400} />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { year, quarterly, monthlyRevenue } = data;

  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
  const nextQuarterYear = currentQuarter === 4 ? year.currentYear + 1 : year.currentYear;

  const reportsList: Report[] = [
    { id: 1, name: `Báo cáo doanh thu tổng hợp ${year.currentYear}`, desc: 'Chi tiết doanh thu theo tháng, quý và khu vực', type: 'pdf' },
    { id: 2, name: 'Chi tiết giao dịch khách hàng', desc: 'Danh sách toàn bộ đơn hàng trong năm kèm thông tin khách hàng', type: 'excel' },
    { id: 3, name: 'Phân tích hiệu suất sản phẩm', desc: 'Đánh giá doanh số, lợi nhuận và tốc độ bán của từng SKU', type: 'pdf' },
    { id: 4, name: 'Báo cáo hoàn trả và hủy đơn', desc: 'Thống kê lý do hoàn trả và tỷ lệ hủy theo tháng', type: 'excel' },
    { id: 5, name: `Dự phóng doanh thu Q${nextQuarter}/${nextQuarterYear}`, desc: 'Mô hình dự báo doanh thu dựa trên dữ liệu lịch sử', type: 'pdf' },
  ];

  const targetPct = Math.min(100, year.targetPct);
  const totalOrders = data.orderStats.total;
  const aov = year.aov;

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0.1}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Báo cáo & KPI</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Download size={16} />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </AnimatedSection>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedSection delay={0.2} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Target size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Doanh thu vs Mục tiêu</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{year.targetPct.toFixed(1)}%</h3>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1" role="progressbar" aria-valuenow={Math.round(targetPct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${targetPct}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
            {formatCurrency(year.yearRevenue)} / {formatCurrency(year.target)}
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.3} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tỷ lệ hoàn thành đơn</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{year.completionRate.toFixed(1)}%</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{totalOrders.toLocaleString('vi-VN')} đơn</p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.4} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Giá trị đơn TB</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(aov)}</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.5} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <RotateCcw size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tỷ lệ hủy đơn</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{year.returnRate.toFixed(1)}%</h3>
            </div>
          </div>
        </AnimatedSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparison Chart */}
        <AnimatedSection delay={0.6} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">So sánh doanh thu YoY</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterly} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="quarter" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(val) => val === undefined ? '' : formatCurrency(val as number)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
                <Bar dataKey="thisYear" name={`Năm ${year.currentYear}`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastYear" name={`Năm ${year.currentYear - 1}`} fill="#9ca3af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>

        {/* Reports List */}
        <AnimatedSection delay={0.7} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Báo cáo có sẵn</h2>
          <div className="flex-1 overflow-y-auto pr-2 max-h-96">
            <div className="space-y-4">
              {reportsList.map((report) => (
                <div key={report.id} className="flex items-start justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {report.type === 'pdf' ? (
                        <FileText className="text-red-500" size={24} />
                      ) : (
                        <FileSpreadsheet className="text-green-500" size={24} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">{report.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{report.desc}</p>
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-medium uppercase tracking-wider rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {report.type}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" aria-label={`Tải ${report.name}`}>
                    <Download size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* Monthly summary table */}
      <AnimatedSection delay={0.8} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Doanh thu 12 tháng gần nhất</h2>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-gray-800">
              <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <th className="pb-3 font-medium">Tháng</th>
                <th className="pb-3 font-medium text-right">Doanh thu</th>
                <th className="pb-3 font-medium text-right">Đơn hàng</th>
                <th className="pb-3 font-medium text-right">Khách hàng</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                  <td className="py-3">{row.month}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 text-right">{row.orders.toLocaleString('vi-VN')}</td>
                  <td className="py-3 text-right">{row.customers.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default ReportsPage;
