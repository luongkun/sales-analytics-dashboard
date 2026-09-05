import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';
import { formatCurrency, MonthlyRevenue } from '../data/salesData';
import { ChevronLeft, Loader2 } from 'lucide-react';

interface DailyRevenue {
  day: string;
  revenue: number;
  orders: number;
  customers: number;
}

interface RevenueChartProps {
  data: MonthlyRevenue[];
  fetchDaily?: (month: string) => Promise<DailyRevenue[]>;
  onDrillDown?: (month: string, dailyData: DailyRevenue[]) => void;
}

export default function RevenueChart({ data, fetchDaily, onDrillDown }: RevenueChartProps) {
  const [drilledMonth, setDrilledMonth] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyRevenue[] | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Nhãn tháng đầy đủ, vd 'T9/2026' → 'Tháng 9/2026'
  const prettyMonth = (label: string): string => label.replace(/^T/, 'Tháng ');

  const handleClick = async (month: string) => {
    setDrilledMonth(month);
    setDailyData(null);
    if (!fetchDaily) {
      onDrillDown?.(month, []);
      return;
    }
    setLoadingDaily(true);
    try {
      const rows = await fetchDaily(month);
      setDailyData(rows);
      onDrillDown?.(month, rows);
    } catch {
      setDailyData([]);
    } finally {
      setLoadingDaily(false);
    }
  };

  const handleBack = () => {
    setDrilledMonth(null);
    setDailyData(null);
  };

  const chartData = drilledMonth ? dailyData ?? [] : data;
  const dataKey = drilledMonth ? 'day' : 'month';

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-800 dark:text-white">
            {drilledMonth ? `Doanh thu theo ngày - ${prettyMonth(drilledMonth)}` : 'Doanh thu theo tháng'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {drilledMonth
              ? `Chi tiết doanh thu từng ngày trong ${prettyMonth(drilledMonth)}`
              : `Biểu đồ doanh thu 12 tháng (${data[0]?.month ?? ''} – ${data[data.length - 1]?.month ?? ''}) - Click vào tháng để xem chi tiết`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {drilledMonth && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại tháng
            </button>
          )}
          {loadingDaily && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400" role="status">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang tải dữ liệu ngày…
            </span>
          )}
          <span className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-sm shadow-blue-500/50"></span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Doanh thu (VNĐ)</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData as MonthlyRevenue[]}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          onClick={
            drilledMonth
              ? undefined
              : (state: { activeLabel?: string | number }) => {
                  if (state?.activeLabel != null) {
                    handleClick(String(state.activeLabel));
                  }
                }
          }
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="60%" stopColor="#6366f1" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey={dataKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}tr`}
          />
          <Tooltip
            cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as Partial<DailyRevenue>;
                return (
                  <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-blue-200/60 dark:border-blue-700/60 rounded-xl shadow-xl shadow-blue-500/10 p-3.5 ring-1 ring-black/5">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{drilledMonth ? 'Ngày' : prettyMonth(String(label))}</p>
                    <p className="text-base font-bold text-gradient mt-1">
                      {formatCurrency(Number(payload[0].value))}
                    </p>
                    {item.orders !== undefined && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
                        🛒 {item.orders} đơn · 👤 {item.customers} khách
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="url(#lineStroke)"
            strokeWidth={3}
            fill="url(#revenueGradient)"
            filter="url(#lineGlow)"
            dot={{
              r: drilledMonth ? 3 : 4,
              fill: '#3b82f6',
              strokeWidth: 2,
              stroke: '#fff',
            }}
            activeDot={{ r: drilledMonth ? 4 : 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
          />
          <defs>
            <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>

      {drilledMonth && dailyData && (
        <div className="mt-4 overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-gray-800">
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th className="pb-2 font-medium">Ngày</th>
                <th className="pb-2 font-medium text-right">Doanh thu</th>
                <th className="pb-2 font-medium text-right">Đơn hàng</th>
                <th className="pb-2 font-medium text-right">Khách hàng</th>
                <th className="pb-2 font-medium text-right">Doanh thu TB/đơn</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-2 font-medium">{row.day}</td>
                  <td className="py-2 text-right">{formatCurrency(row.revenue)}</td>
                  <td className="py-2 text-right">{row.orders}</td>
                  <td className="py-2 text-right">{row.customers}</td>
                  <td className="py-2 text-right">{row.orders > 0 ? formatCurrency(Math.round(row.revenue / row.orders)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}