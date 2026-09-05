import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { LegendPayload } from 'recharts';
import { formatCurrency, RegionRevenue } from '../data/salesData';

interface RegionChartProps {
  data: RegionRevenue[];
}

const quarters = [
  { key: 'q1', name: 'Quý 1', from: '#3b82f6', to: '#6366f1' },
  { key: 'q2', name: 'Quý 2', from: '#8b5cf6', to: '#a855f7' },
  { key: 'q3', name: 'Quý 3', from: '#10b981', to: '#14b8a6' },
  { key: 'q4', name: 'Quý 4', from: '#f59e0b', to: '#f97316' },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + Number(entry.value), 0);
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-blue-200/60 dark:border-blue-700/60 rounded-xl shadow-xl p-3.5 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(Number(entry.value))}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-6 text-sm mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Cả năm</span>
          <span className="font-bold text-gradient">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function RegionChart({ data }: RegionChartProps) {
  const [hoveredQuarter, setHoveredQuarter] = useState<string | null>(null);
  const total = data.reduce(
    (sum, region) =>
      sum + quarters.reduce((s, q) => s + (region[q.key as keyof RegionRevenue] as number), 0),
    0
  );

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">Doanh thu theo khu vực</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Tổng cả 3 vùng: <span className="font-semibold text-gradient">{formatCurrency(total)}</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={4}>
          <defs>
            {quarters.map((q) => (
              <linearGradient key={q.key} id={`barGradient-${q.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={q.to} stopOpacity={1} />
                <stop offset="100%" stopColor={q.from} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="region"
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            iconSize={8}
            onMouseEnter={(entry: LegendPayload) =>
              setHoveredQuarter(typeof entry.dataKey === 'string' ? entry.dataKey : null)
            }
            onMouseLeave={() => setHoveredQuarter(null)}
          />
          {quarters.map((q) => (
            <Bar
              key={q.key}
              dataKey={q.key}
              name={q.name}
              fill={`url(#barGradient-${q.key})`}
              radius={[6, 6, 0, 0]}
              barSize={22}
              className="transition-opacity duration-200"
              style={{ opacity: hoveredQuarter === null || hoveredQuarter === q.key ? 1 : 0.3 }}
              animationDuration={900}
              animationEasing="cubic-bezier(0.22, 1, 0.36, 1)"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
