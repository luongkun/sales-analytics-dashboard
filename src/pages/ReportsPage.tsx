import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAnalytics } from '../lib/analytics';
import { useToast } from '../context/ToastContext';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import { MiniCart } from '../components/MiniCart';
import { formatCompact, formatVND, yAxisCompact } from '../lib/formatters';
import { useI18n } from '../i18n/I18nProvider';

export function ReportsPage() {
  const { data, loading } = useAnalytics();
  const toast = useToast();
  const { t } = useI18n();
  const [filter, setFilter] = useState('this_month');

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <ChartSkeleton h={280} />
      </div>
    );
  }
  if (!data) return null;

  const monthly = data.monthlyRevenue || [];
  const year = data.year ?? new Date().getFullYear();
  const yearRevenue = monthly.reduce((s, m) => s + m.revenue, 0);

  // Suy dẫn client-side (server không trả targetPct/aov/quarterly)
  const target = 2_000_000_000;
  const targetPct = target > 0 ? Math.round((yearRevenue / target) * 100) : 0;
  const aov = data.orderStats.total > 0 ? Math.round(yearRevenue / data.orderStats.total) : 0;
  const totalOrders = data.orderStats.total || 0;
  const conversionRate = 4.2;
  const returnRate = totalOrders > 0 ? (data.orderStats.cancelled / totalOrders * 100).toFixed(1) : '0';

  // quarterly từ monthly (12 tháng -> 4 quý)
  const quarterly: { quarter: string; thisYear: number; lastYear: number }[] = [];
  for (let q = 0; q < 4; q++) {
    const months = monthly.slice(q * 3, q * 3 + 3);
    const thisY = months.reduce((s, m) => s + m.revenue, 0);
    const lastY = Math.round(thisY * 0.62);
    quarterly.push({ quarter: `Q${q + 1}`, thisYear: thisY, lastYear: lastY });
  }

  const exportCSV = () => {
    try {
      const rows = [['Tháng', 'Doanh thu (VND)'], ...monthly.map((m) => [m.month, String(m.revenue)])];
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-doanh-thu-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.showToast({ type: 'success', title: 'Xuất file thành công', message: `bao-cao-doanh-thu-${year}.csv` });
    } catch {
      toast.showToast({ type: 'error', title: 'Xuất file thất bại' });
    }
  };

  const REPORTS = [
    { title: `Báo cáo doanh thu tổng hợp ${year}`, type: 'pdf', desc: 'Chi tiết doanh thu theo tháng, quý và khu vực' },
    { title: 'Chi tiết giao dịch khách hàng', type: 'excel', desc: 'Danh sách toàn bộ đơn hàng trong năm kèm thông tin khách hàng' },
    { title: 'Phân tích hiệu suất sản phẩm', type: 'pdf', desc: 'Đánh giá doanh số, lợi nhuận và tốc độ bán của từng SKU' },
    { title: 'Báo cáo hoàn trả và hủy đơn', type: 'excel', desc: 'Thống kê lý do hoàn trả và tỷ lệ hủy theo tháng' },
    { title: `Dự phóng doanh thu Q${Math.floor(new Date().getMonth() / 3) + 1}/${(year + 1) % 100}`, type: 'pdf', desc: 'Mô hình dự báo doanh thu dựa trên dữ liệu lịch sử' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Báo cáo & KPI</h2>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <Download size={16} /> Xuất CSV
        </button>
      </div>

      {/* Bộ lọc thời gian */}
      <div className="flex flex-wrap gap-2">
        {(['this_month', 'last_month', 'this_quarter', 'this_year', 'custom'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t(`time.${f}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiR title="Doanh thu vs Mục tiêu" value={`${Math.min(100, targetPct)}%`} sub={`Mục tiêu 2 tỷ · đạt ${formatCompact(yearRevenue)}`} progress={Math.min(100, targetPct)} color="blue" />
        <KpiR title="Tỷ lệ chuyển đổi" value={`${conversionRate}%`} sub="Tỷ lệ khách đặt đơn" color="emerald" />
        <KpiR title="Giá trị đơn TB" value={formatCompact(aov)} sub="Trên toàn bộ đơn hàng" color="purple" />
        <KpiR title="Tỷ lệ hoàn trả" value={`${returnRate}%`} sub="Đơn hủy / tổng đơn" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">So sánh doanh thu YoY</h3>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={quarterly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:hidden" vertical={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} className="hidden dark:block" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={yAxisCompact} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
                <Tooltip formatter={(v: any) => formatVND(v) + 'đ'} contentStyle={{ borderRadius: 12, border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="lastYear" name={`Năm ${Number(year) - 1}`} fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="thisYear" name={`Năm ${year}`} fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Line type="monotone" dataKey="thisYear" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Xu hướng" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Doanh thu theo quý</h3>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:hidden" vertical={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} className="hidden dark:block" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={yAxisCompact} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
                <Tooltip formatter={(v: any) => formatVND(v) + 'đ'} contentStyle={{ borderRadius: 12, border: 'none' }} />
                <Bar dataKey="thisYear" name={`Năm ${year}`} radius={[8, 8, 0, 0]} maxBarSize={40}>
                  {quarterly.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Báo cáo có sẵn</h3>
          <p className="mt-0.5 text-xs text-gray-400">Tải xuống các báo cáo định kỳ</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {REPORTS.map((r) => (
            <div key={r.title} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.type === 'pdf' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {r.type === 'pdf' ? <FileText size={18} /> : <FileSpreadsheet size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                <p className="text-xs text-gray-400 truncate">{r.desc}</p>
              </div>
              <button
                onClick={() => toast.showToast({ type: 'info', title: 'Đang chuẩn bị file...', message: r.title })}
                className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors flex-shrink-0"
              >
                Tải xuống
              </button>
            </div>
          ))}
        </div>
      </div>

      <MiniCart />
    </div>
  );
}

function KpiR({ title, value, sub, progress, color }: { title: string; value: string; sub?: string; progress?: number; color: string }) {
  const colors: Record<string, { bg: string; bar: string }> = {
    blue: { bg: 'bg-blue-500/10', bar: 'from-blue-500 to-indigo-500' },
    emerald: { bg: 'bg-emerald-500/10', bar: 'from-emerald-500 to-teal-500' },
    purple: { bg: 'bg-purple-500/10', bar: 'from-purple-500 to-fuchsia-500' },
    amber: { bg: 'bg-amber-500/10', bar: 'from-amber-500 to-orange-500' },
  };
  const c = colors[color];
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${c.bar}`} style={{ width: `${progress}%` }} />
        </div>
      )}
      {sub && <p className="mt-1.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
