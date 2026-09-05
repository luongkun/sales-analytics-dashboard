import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { formatCurrency, CategoryRevenue } from '../data/salesData';

interface CategoryChartProps {
  data: CategoryRevenue[];
}

const CustomTooltip = ({ active, payload, total }: { active?: boolean; payload?: Array<{ payload: CategoryRevenue }>; total: number }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as CategoryRevenue;
    const percent = ((item.value / total) * 100).toFixed(1);
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-purple-200/60 dark:border-purple-700/60 rounded-xl shadow-xl p-3.5 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.name}
        </p>
        <p className="text-base font-bold text-gradient mt-1">{formatCurrency(item.value)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Chiếm {percent}% tổng doanh thu
        </p>
      </div>
    );
  }
  return null;
};

const renderActiveShape = (props: PieSectorDataItem) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
      />
    </g>
  );
};

export default function CategoryChart({ data }: CategoryChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const best = data.reduce((max, item) => (item.value > max.value ? item : max), data[0]);

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">Doanh thu theo danh mục</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Dẫn đầu: <span className="font-semibold text-purple-600 dark:text-purple-400">{best?.name}</span>
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={4}
                cornerRadius={6}
                activeShape={renderActiveShape}
                animationDuration={900}
                animationEasing="cubic-bezier(0.22, 1, 0.36, 1)"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                    className="transition-opacity duration-200"
                    style={{ opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.35 }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none sm:pl-2">
            {activeIndex === undefined && (
              <>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold">Tổng danh mục</p>
                <p className="text-xl font-bold text-gradient">{formatCurrency(total)}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 min-w-0 flex-1">
          {data.map((item) => {
            const percent = ((item.value / total) * 100).toFixed(1);
            return (
              <div
                key={item.name}
                className="flex items-center gap-3 p-2 rounded-lg cursor-default transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                onMouseEnter={() => setActiveIndex(data.indexOf(item))}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 ring-4 transition-transform"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}55`, ['--tw-ring-color' as string]: `${item.color}22` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatCurrency(item.value)} · {percent}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
