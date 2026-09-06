import { CheckCircle2, Clock, Package, XCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAnalytics } from '../lib/analytics';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import { RecentOrders, StatusPie } from '../components/charts/Charts';
import { MiniCart } from '../components/MiniCart';
import { formatVND } from '../lib/formatters';

export function OrdersPage() {
  const { data, loading } = useAnalytics();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <ChartSkeleton h={260} />
      </div>
    );
  }
  if (!data) return null;

  const st = data.orderStats;
  const total = st.total || 0;
  const pct = (x: number) => (total > 0 ? ((x / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi4 title="Tổng đơn hàng" value={`${formatVND(total)}`} icon={Package} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <Kpi4 title={`Hoàn thành (${pct(st.completed)}%)`} value={formatVND(st.completed)} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <Kpi4 title={`Đang xử lý (${pct(st.processing)}%)`} value={formatVND(st.processing)} icon={Clock} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <Kpi4 title={`Đã hủy (${pct(st.cancelled)}%)`} value={formatVND(st.cancelled)} icon={XCircle} color="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Xu hướng đơn hàng</h3>
          <p className="mt-0.5 text-xs text-gray-400">Đơn hàng theo ngày (14 ngày gần nhất)</p>
          <OrderTrendSimple data={data.orderTrend} />
        </div>
        <StatusPie data={data.orderStatus} />
      </div>

      <RecentOrders data={data.recentOrders} />
      <MiniCart />
    </div>
  );
}

function OrderTrendSimple({ data }: { data: { date: string; orders: number }[] }) {
  return (
    <div className="mt-4 h-[260px]">
      <ChartTrend data={data} />
    </div>
  );
}

function ChartTrend({ data }: { data: { date: string; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:hidden" vertical={false} />
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} className="hidden dark:block" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }} />
        <Area type="monotone" dataKey="orders" name="Đơn hàng" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#ordersGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Kpi4({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof Package; color: string }) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
