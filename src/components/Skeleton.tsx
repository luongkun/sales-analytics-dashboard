import type { ReactNode } from 'react';

export function CardSkeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 ${className}`}>
    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
    <div className="h-8 w-32 rounded bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
  </div>;
}

export function ChartSkeleton({ h = 300 }: { h?: number }) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-1" />
      <div className="h-3 w-56 rounded bg-gray-100 dark:bg-gray-700/60 animate-pulse mb-4" />
      <div className="w-full rounded-xl bg-gray-100 dark:bg-gray-700/40 animate-pulse" style={{ height: h }} />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
            <div className="h-3 flex-1 rounded bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
            <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaggeredFadeIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        opacity: 0,
        transform: 'translateY(16px)',
        animation: `fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
}
