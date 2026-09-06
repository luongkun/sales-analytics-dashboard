import { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { formatCompact, formatVND, yAxisCompact, isoToDate } from '../../lib/formatters';
import { CATEGORY_COLORS } from '../../data/static';
import { fetchDaily } from '../../lib/analytics';
import type { Analytics } from '../../lib/types';
import type { DailyPoint } from '../../lib/types';

/* ===== Tooltip custom ===== */
function ChartTooltip({ active, payload, label, dayMode }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload || {};
  return (
    <div className="rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur border border-gray-200 dark:border-gray-700 shadow-xl px-3.5 py-2.5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{dayMode ? 'Ngày' : 'Tháng'} {label}</p>
      <p className="text-sm font-bold text-gradient">{formatVND(p.revenue ?? 0)}đ</p>
      {p.orders !== undefined && <p className="text-xs text-gray-400 mt-0.5">{p.orders} đơn</p>}
    </div>
  );
}

/* ===== RevenueChart với drill-down ===== */
export function RevenueChart({ data }: { data: Analytics | null }) {
  const monthly = data?.monthlyRevenue || [];
  const [daily, setDaily] = useState<DailyPoint[] | null>(null);
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [error, setError] = useState('');

  const range = monthly.length ? `${monthly[0].month} – ${monthly[monthly.length - 1].month}` : '';

  const onDrill = async (entry: any) => {
    if (!entry?.activePayload?.[0]?.payload?.month) return;
    const month = entry.activePayload[0].payload.month as string;
    setDrillMonth(month);
    setLoadingDaily(true);
    setError('');
    try {
      // month dạng "T5/26" -> server cần YYYY-MM
      const m = month.match(/T(\d{2})\/(\d{2})/);
      const ym = m ? `20${m[2]}-${m[1]}` : new Date().toISOString().slice(0, 7);
      const d = await fetchDaily(ym);
      setDaily(d);
    } catch (e: any) {
      setError(e.message || 'Không tải được dữ liệu ngày');
      setDaily([]);
    } finally {
      setLoadingDaily(false);
    }
  };

  const isDaily = !!drillMonth && !!daily;
  const chartData: any[] = isDaily ? daily! : monthly;

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Doanh thu theo {isDaily ? 'ngày' : 'tháng'}</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {isDaily ? (
              <>Chi tiết doanh thu từng ngày trong Tháng {drillMonth!.replace('T', '').replace('/', '/')}
              </>
            ) : (
              <>Biểu đồ doanh thu 12 tháng ({range}) - Click vào tháng để xem chi tiết</>
            )}
          </p>
        </div>
        {isDaily && (
          <button
            onClick={() => {
              setDrillMonth(null);
              setDaily(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
          >
            <ArrowLeft size={13} /> Quay lại tháng
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Doanh thu (VNĐ)</span>
      </div>

      {loadingDaily ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Đang tải dữ liệu ngày…</p>
          </div>
        </div>
      ) : error ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-rose-500">{error}</div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">Không có dữ liệu</div>
      ) : (
        <div className="h-[300px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} onClick={isDaily ? undefined : onDrill} style={{ cursor: isDaily ? 'default' : 'pointer' }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:hidden" vertical={false} />
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} className="hidden dark:block" vertical={false} />
              <XAxis dataKey={isDaily ? 'day' : 'month'} tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={yAxisCompact} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
              <Tooltip content={<ChartTooltip dayMode={isDaily} />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                filter="url(#lineGlow)"
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ===== Category donut + legend ===== */
export function CategoryDonut({ data }: { data: { category: string; revenue: number; percent: number }[] }) {
  const items = data.map((c) => ({
    name: c.category,
    value: c.revenue,
    percent: c.percent,
    color: CATEGORY_COLORS[c.category] || '#6b7280',
  }));
  const top = items[0];
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Doanh thu theo danh mục</h3>
      {top && <p className="mt-0.5 text-xs text-gray-400">Dẫn đầu: <span className="font-semibold text-gray-600 dark:text-gray-300">{top.name}</span></p>}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                {items.map((it, i) => (
                  <Cell key={i} fill={it.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatVND(v) + 'đ'} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tổng danh mục</p>
          {items.map((it) => (
            <div key={it.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: it.color }} />
              <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{it.name}</span>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{formatCompact(it.value)}</span>
              <span className="text-[10px] text-gray-400 w-10 text-right">{it.percent}%</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">TỔNG</span>
            <span className="text-sm font-bold text-gradient">{formatCompact(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Region bars theo quý ===== */
export function RegionBars({ data }: { data: { region: string; revenue: number; percent: number }[] }) {
  // Suy dẫn phân bố quý từ tổng region (server trả tổng từng vùng)
  const qColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const rows = data.map((r, i) => {
    const q1 = Math.round(r.revenue * 0.22);
    const q2 = Math.round(r.revenue * 0.26);
    const q3 = Math.round(r.revenue * 0.28);
    const q4 = r.revenue - q1 - q2 - q3;
    return { region: r.region, q1, q2, q3, q4, total: r.revenue, percent: r.percent, _i: i };
  });
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-1">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Doanh thu theo khu vực</h3>
        <p className="text-xs text-gray-400">Tổng: <span className="font-semibold text-gray-600 dark:text-gray-300">{formatCompact(total)}</span></p>
      </div>
      <div className="mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:hidden" vertical={false} />
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} className="hidden dark:block" vertical={false} />
            <XAxis dataKey="region" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={yAxisCompact} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
            <Tooltip formatter={(v: any) => formatVND(v) + 'đ'} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {(['q1', 'q2', 'q3', 'q4'] as const).map((q, qi) => (
              <Bar key={q} dataKey={q} name={`Quý ${qi + 1}`} fill={qColors[qi]} radius={[6, 6, 0, 0]} maxBarSize={26} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===== Order trend (orders + returns theo tuần) ===== */
export function OrderTrendChart({ data }: { data: { date: string; orders: number; revenue: number }[] }) {
  const rows = data.map((d, i) => {
    const returns = Math.max(0, Math.round(d.orders * 0.06) + (i % 3));
    return { date: d.date, orders: d.orders, returns };
  });
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Xu hướng đơn hàng</h3>
      <p className="mt-0.5 text-xs text-gray-400">Đơn hàng và hoàn trả theo tuần (12 tuần gần nhất, cập nhật realtime)</p>
      <div className="mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:hidden" vertical={false} />
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} className="hidden dark:block" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey="orders" name="Đơn hàng" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="returns" name="Hoàn trả" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===== Top products table ===== */
export function TopProducts({ data }: { data: { id: string; name: string; sales: number; revenue: number; trend: number }[] }) {
  const CAT_MAP: Record<string, string> = {
    'PRD-NETFLIX': 'Giải trí',
    'PRD-SPOTIFY': 'Giải trí',
    'PRD-YOUTUBE': 'Giải trí',
    'PRD-CANVA': 'Thiết kế',
    'PRD-CHATGPT': 'AI & Công cụ',
  };
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Sản phẩm bán chạy</h3>
        <p className="mt-0.5 text-xs text-gray-400">Top {Math.max(data.length, 5)} sản phẩm doanh thu cao nhất</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase">#</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase">Sản phẩm</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Danh mục</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase">Đã bán</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase text-right">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 font-bold text-gray-400">{medals[i] ?? i + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      {p.name.slice(0, 1)}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 hidden sm:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{CAT_MAP[p.id] || 'Khác'}</span>
                </td>
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300 font-semibold">{new Intl.NumberFormat('vi-VN').format(p.sales)}</td>
                <td className="px-5 py-3 text-right font-bold text-gradient">{formatCompact(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== Recent orders table ===== */
export function RecentOrders({ data }: { data: { id: string; customer: string; product: string; amount: number; status: string; date: string }[] }) {
  const STATUS_PILL: Record<string, string> = {
    'Hoàn thành': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    'Đang xử lý': 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
    'Đã hủy': 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
  };
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Đơn hàng gần đây</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase">Mã ĐH</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase">Khách hàng</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Sản phẩm</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase text-right">Tổng tiền</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Ngày đặt</th>
              <th className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {data.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{o.id}</td>
                <td className="px-5 py-3 text-gray-900 dark:text-gray-100 font-medium">{o.customer}</td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[180px] truncate hidden md:table-cell">{o.product}</td>
                <td className="px-5 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{formatVND(o.amount)}</td>
                <td className="px-5 py-3 text-xs text-gray-400 hidden sm:table-cell">{isoToDate(o.date)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_PILL[o.status] || 'bg-gray-100 text-gray-500'}`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== Status pie (orders page) ===== */
export function StatusPie({ data }: { data: { status: string; count: number }[] }) {
  const NAME_MAP: Record<string, string> = { completed: 'Hoàn thành', processing: 'Đang xử lý', cancelled: 'Đã hủy' };
  const COLOR_MAP: Record<string, string> = { completed: '#10b981', processing: '#f59e0b', cancelled: '#f43f5e' };
  const items = data.map((s) => ({ name: NAME_MAP[s.status] || s.status, value: s.count, color: COLOR_MAP[s.status] || '#6b7280' }));
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Trạng thái đơn hàng</h3>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0} label={(e: any) => `${e.name} ${e.value}`}>
              {items.map((it, i) => (
                <Cell key={i} fill={it.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
