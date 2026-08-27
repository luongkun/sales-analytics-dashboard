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
import { Target, Filter, DollarSign, RotateCcw, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';

interface ComparisonData {
  quarter: string;
  thisYear: number;
  lastYear: number;
}

interface Report {
  id: number;
  name: string;
  desc: string;
  type: 'pdf' | 'excel';
}

const comparisonData: ComparisonData[] = [
  { quarter: 'Q1', thisYear: 844000000, lastYear: 680000000 },
  { quarter: 'Q2', thisYear: 1179000000, lastYear: 920000000 },
  { quarter: 'Q3', thisYear: 1424000000, lastYear: 1150000000 },
  { quarter: 'Q4', thisYear: 1855000000, lastYear: 1543000000 },
];

const reportsList: Report[] = [
  { id: 1, name: 'Báo cáo doanh thu tổng hợp 2025', desc: 'Chi tiết doanh thu theo tháng, quý và khu vực', type: 'pdf' },
  { id: 2, name: 'Chi tiết giao dịch khách hàng', desc: 'Danh sách toàn bộ đơn hàng trong năm kèm thông tin khách hàng', type: 'excel' },
  { id: 3, name: 'Phân tích hiệu suất sản phẩm', desc: 'Đánh giá doanh số, lợi nhuận và tốc độ bán của từng SKU', type: 'pdf' },
  { id: 4, name: 'Báo cáo hoàn trả và hủy đơn', desc: 'Thống kê lý do hoàn trả và tỷ lệ hủy theo tháng', type: 'excel' },
  { id: 5, name: 'Dự phóng doanh thu Q1/2026', desc: 'Mô hình dự báo doanh thu dựa trên dữ liệu lịch sử', type: 'pdf' },
];

const ReportsPage = () => {
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
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">88.3%</h3>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '88.3%' }}></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">5.3 / 6.0 tỷ</p>
        </AnimatedSection>

        <AnimatedSection delay={0.3} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Filter size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tỷ lệ chuyển đổi</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">3.2%</h3>
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
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">222,588 ₫</h3>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.5} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <RotateCcw size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tỷ lệ hoàn trả</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">2.8%</h3>
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
              <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="quarter" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(val) => val === undefined ? '' : formatCurrency(val as number)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
                <Bar dataKey="thisYear" name="Năm nay" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastYear" name="Năm ngoái" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>

        {/* Reports List */}
        <AnimatedSection delay={0.7} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Báo cáo có sẵn</h2>
          <div className="flex-1 overflow-y-auto pr-2">
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
                  <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Download size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default ReportsPage;