import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { OrderTrend } from '../data/salesData';

interface OrderTrendChartProps {
  data: OrderTrend[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    const orders = payload.find((p) => p.dataKey === 'orders')?.value ?? 0;
    const returns = payload.find((p) => p.dataKey === 'returns')?.value ?? 0;
    const rate = orders > 0 ? ((returns / orders) * 100).toFixed(1) : '0';
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-violet-200/60 dark:border-violet-700/60 rounded-xl shadow-xl p-3.5 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />
            Đơn hàng
          </span>
          <span className="font-bold text-gray-800 dark:text-white">{orders}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm mt-1.5">
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Hoàn trả
          </span>
          <span className="font-semibold text-red-500">{returns}</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          Tỷ lệ hoàn trả: <span className="font-semibold">{rate}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function OrderTrendChart({ data }: OrderTrendChartProps) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">Xu hướng đơn hàng</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {`Đơn hàng và hoàn trả theo tuần (12 tuần gần nhất, cập nhật ${data[data.length - 1]?.week ?? ''})`}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="ordersAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ordersLineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="ordersGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="none"
            fill="url(#ordersAreaGradient)"
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="orders"
            name="Đơn hàng"
            stroke="url(#ordersLineStroke)"
            strokeWidth={3}
            filter="url(#ordersGlow)"
            dot={{ r: 3.5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
            animationDuration={900}
            animationEasing="cubic-bezier(0.22, 1, 0.36, 1)"
          />
          <Line
            type="monotone"
            dataKey="returns"
            name="Hoàn trả"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
            animationDuration={1100}
            animationEasing="cubic-bezier(0.22, 1, 0.36, 1)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
