import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatCompact } from '../lib/formatters';

interface KpiCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
  format?: 'currency' | 'number';
  suffix?: string;
}

const COLORS = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
};

export function KpiCard({ title, value, previousValue, icon: Icon, color = 'blue', format = 'currency', suffix }: KpiCardProps) {
  const display = typeof value === 'number' ? (format === 'currency' ? formatCompact(value) : new Intl.NumberFormat('vi-VN').format(value)) : value;
  let deltaPct: number | null = null;
  if (typeof value === 'number' && previousValue !== undefined && previousValue !== 0) {
    deltaPct = Math.round(((value - previousValue) / Math.abs(previousValue)) * 1000) / 10;
  } else if (typeof value === 'number' && previousValue === 0) {
    deltaPct = value > 0 ? 100 : previousValue === 0 && value === 0 ? 0 : null;
  }
  const c = COLORS[color];
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {display}
            {suffix && <span className="text-sm font-semibold ml-0.5">{suffix}</span>}
          </p>
          {deltaPct !== null && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {deltaPct >= 0 ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : (
                <TrendingDown size={14} className="text-rose-500" />
              )}
              <span className={`text-xs font-bold ${deltaPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {deltaPct >= 0 ? '+' : ''}
                {deltaPct.toLocaleString('vi-VN')}%
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">so với kỳ trước</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.text}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
