import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700 rounded';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  };

  const variantStyles = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationClasses[animation],
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="text" width="60%" height={16} className="mt-2" />
        </div>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <div className="space-y-4">
        <Skeleton variant="text" width="100%" height={12} />
        <Skeleton variant="text" width="80%" height={12} />
        <Skeleton variant="text" width="60%" height={12} />
      </div>
    </div>
  );
}

export function SkeletonChart({ className = '', height = 300 }: { className?: string; height?: number }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700', className)} style={{ height }}>
      <div className="mb-6">
        <Skeleton variant="text" width="30%" height={20} />
        <Skeleton variant="text" width="50%" height={14} className="mt-1" />
      </div>
      <div className="space-y-2 h-full">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" width="100%" height={20} className={i > 5 ? 'opacity-50' : ''} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      <div className="mb-4">
        <Skeleton variant="text" width="30%" height={20} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {[...Array(columns)].map((_, i) => (
                <th key={i} className="pb-3">
                  <Skeleton variant="text" width="80%" height={12} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100 dark:border-gray-700/50">
                {[...Array(columns)].map((_, colIdx) => (
                  <td key={colIdx} className="py-3">
                    <Skeleton variant="text" width="80%" height={14} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={28} className="mt-2" />
          <Skeleton variant="text" width="50%" height={14} className="mt-3" />
        </div>
        <Skeleton variant="circular" width={44} height={44} className="ring-4" />
      </div>
    </div>
  );
}