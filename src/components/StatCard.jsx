import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '../data/salesData';

export default function StatCard({ title, value, previousValue, icon: Icon, format = 'number', color = 'blue' }) {
  const formattedValue = format === 'currency' ? formatCurrency(value) : 
                         format === 'percent' ? `${value}%` : 
                         formatNumber(value);

  const change = previousValue ? (((value - previousValue) / previousValue) * 100).toFixed(1) : 0;
  const isPositive = change >= 0;

  const colorMap = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/50', icon: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-100 dark:ring-blue-900/30' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/50', icon: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-100 dark:ring-purple-900/30' },
    green: { bg: 'bg-emerald-50 dark:bg-emerald-900/50', icon: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-100 dark:ring-emerald-900/30' },
    orange: { bg: 'bg-amber-50 dark:bg-amber-900/50', icon: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-100 dark:ring-amber-900/30' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formattedValue}</p>
          {previousValue && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-gray-400 ml-1">so với kỳ trước</span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center ring-4 ${c.ring}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}
