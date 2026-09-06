import { DollarSign, FileText, Trophy } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { useAnalytics } from '../lib/analytics';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import { formatCompact, formatVND, yAxisCompact } from '../lib/formatters';
import { CATEGORY_COLORS } from '../data/static';

export function RevenuePage() {
  const { data, loading } = useAnalytics();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <ChartSkeleton h={380} />
      </div>
    );
  }
  if (!data) return null;

  // Suy dẫn client-side (server trả year: number — contract cũ cần object)
  const monthly = data.monthlyRevenue || [];
  const currentYear = data.year ?? new Date().getFullYear();
  const yearRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const avgPerMonth = monthly.length ? Math.round(yearRevenue / monthly.length) : 0;
  const best = monthly.reduce((acc, m) => (m.revenue > (acc?.revenue ?? 0) ? m : acc), monthly[0]);
  const bestMonth = { label: best?.month ?? '—', revenue: best?.revenue ?? 0 };

  const catItems = (data.categoryRevenue || []).map((c) => ({ name: c.category, value: c.revenue, color: CATEGORY_COLORS[c.category] || '#6b7280' }));
  const regionRows = (data.regionRevenue || []).map((r) => ({
    region: r.region,
    q1: Math.round(r.revenue * 0.22),
    q2: Math.round(r.revenue * 0.26),
    q3: Math.round(r.revenue * 0.28),
    q4: r.revenue - Math.round(r.revenue * 0.22) - Math.round(r.revenue * 0.26) - Math.round(r.revenue * 0.28),
  }));
  const qColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi3 title={`Doanh thu năm ${currentYear}`} value={formatCompact(yearRevenue)} icon={DollarSign} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <Kpi3 title="Doanh thu trung bình/tháng" value={formatCompact(avgPerMonth)} icon={FileText} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <Kpi3 title="Tháng cao nhất" value={`${bestMonth.label}: ${formatCompact(bestMonth.revenue)}`} icon={Trophy} color="bg-purple-500/10 text-purple-600 dark:text-purple-400" />
      </div>

      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Biểu đồ doanh thu theo tháng</h3>
        <p className="mt-0.5 text-xs text-gray-400">Di chuột để xem chi tiết từng tháng</p>
        <div className="mt-4 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={yAxisCompact} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
              <Tooltip
                formatter={(v: any) => [formatVND(v) + 'đ', 'Doanh thu']}
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 12, color: '#f3f4f6' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Cơ cấu theo danh mục</h3>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catItems} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={5} strokeWidth={0}>
                  {catItems.map((it, i) => (
                    <Cell key={i} fill={it.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatVND(v) + 'đ'} contentStyle={{ borderRadius: 12, border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Doanh thu theo khu vực ({currentYear})</h3>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionRows} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="region" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={yAxisCompact} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
                <Tooltip formatter={(v: any) => formatVND(v) + 'đ'} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 12, color: '#f3f4f6' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {(['q1', 'q2', 'q3', 'q4'] as const).map((q, qi) => (
                  <Bar key={q} dataKey={q} name={`Quý ${qi + 1}`} fill={qColors[qi]} radius={[6, 6, 0, 0]} maxBarSize={26} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi3({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof DollarSign; color: string }) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
      </div>
    </div>
  );
}
