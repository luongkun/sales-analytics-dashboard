import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { formatCurrency, CategoryRevenue } from '../data/salesData';

interface CategoryChartProps {
  data: CategoryRevenue[];
}

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
  const active = activeIndex !== undefined ? data[activeIndex] : undefined;
  const activePercent = active && total > 0 ? ((active.value / total) * 100).toFixed(1) : null;

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
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
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
            </PieChart>
          </ResponsiveContainer>
          {/* Chi tiết hiển thị ngay tâm donut — không còn tooltip trôi đè chữ */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
            {active ? (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full mb-1 flex-shrink-0"
                  style={{ backgroundColor: active.color }}
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate max-w-[104px] mx-auto">
                  {active.name}
                </p>
                <p className="text-lg font-bold text-gradient leading-tight">{formatCurrency(active.value)}</p>
                {activePercent && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-[104px] mx-auto leading-snug">
                    Chiếm {activePercent}% tổng doanh thu
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold">
                  Tổng danh mục
                </p>
                <p className="text-xl font-bold text-gradient">{formatCurrency(total)}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 min-w-0 flex-1">
          {data.map((item) => {
            const index = data.indexOf(item);
            const percent = ((item.value / total) * 100).toFixed(1);
            const isActive = activeIndex === index;
            return (
              <div
                key={item.name}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-gray-100 dark:bg-gray-700/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                onClick={() => setActiveIndex(isActive ? undefined : index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveIndex(isActive ? undefined : index);
                  }
                }}
                aria-pressed={isActive}
                aria-label={`${item.name}: ${formatCurrency(item.value)}, ${percent}%`}
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
