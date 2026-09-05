import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { formatCurrency, formatNumber } from '../data/salesData';
import { useCountUp } from '../hooks/useCountUp';

type FormatType = 'currency' | 'percent' | 'number';
type ColorType = 'blue' | 'purple' | 'green' | 'orange';

interface StatCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  format?: FormatType;
  color?: ColorType;
}

const colorMap: Record<ColorType, { bg: string; icon: string; ring: string; bar: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    icon: 'text-white',
    ring: 'shadow-lg shadow-blue-500/30',
    bar: 'from-blue-500 to-indigo-500',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-fuchsia-600',
    icon: 'text-white',
    ring: 'shadow-lg shadow-purple-500/30',
    bar: 'from-purple-500 to-fuchsia-500',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    icon: 'text-white',
    ring: 'shadow-lg shadow-emerald-500/30',
    bar: 'from-emerald-500 to-teal-500',
  },
  orange: {
    bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    icon: 'text-white',
    ring: 'shadow-lg shadow-amber-500/30',
    bar: 'from-amber-500 to-orange-500',
  },
};

export default function StatCard({ title, value, previousValue, icon: Icon, format = 'number', color = 'blue' }: StatCardProps) {
  const animatedValue = useCountUp(value);
  const formattedValue = format === 'currency' ? formatCurrency(animatedValue) :
                          format === 'percent' ? `${animatedValue.toFixed(1)}%` :
                          formatNumber(Math.round(animatedValue));

  const changeValue = previousValue ? (((value - previousValue) / previousValue) * 100) : 0;
  const change = changeValue.toFixed(1);
  const isPositive = changeValue >= 0;

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.bar}`} />
      <div className="flex items-start justify-between relative">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1.5 tracking-tight">{formattedValue}</p>
          {previousValue && (
            <div className="flex items-center gap-1 mt-2.5">
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">so với kỳ trước</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${c.bg} ${c.ring} rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}
