import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ReactNode;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/** Chip icon + thanh tiến độ theo loại — không tô cả thẻ để giữ nền trung tính sạch */
const accents = {
  success: {
    chip: 'bg-emerald-500/10 dark:bg-emerald-400/15 ring-emerald-500/25 dark:ring-emerald-400/25 text-emerald-600 dark:text-emerald-400',
    bar: 'from-emerald-500 to-teal-400',
  },
  error: {
    chip: 'bg-rose-500/10 dark:bg-rose-400/15 ring-rose-500/25 dark:ring-rose-400/25 text-rose-600 dark:text-rose-400',
    bar: 'from-rose-500 to-red-400',
  },
  warning: {
    chip: 'bg-amber-500/10 dark:bg-amber-400/15 ring-amber-500/25 dark:ring-amber-400/25 text-amber-600 dark:text-amber-400',
    bar: 'from-amber-500 to-orange-400',
  },
  info: {
    chip: 'bg-sky-500/10 dark:bg-sky-400/15 ring-sky-500/25 dark:ring-sky-400/25 text-sky-600 dark:text-sky-400',
    bar: 'from-sky-500 to-cyan-400',
  },
} as const;

const DEFAULT_DURATION = 5000;
const EXIT_MS = 260;
/** Số toast hiển thị cùng lúc — toast cũ tự ẩn khi vượt */
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  /** id các toast đang trong animation ra ngoài */
  const [leaving, setLeaving] = useState<Record<string, true>>({});
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Dọn timer khi unmount để không rò rỉ
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  /** Đóng có animation: chạy toast-out rồi mới bỏ khỏi danh sách */
  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setLeaving((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      setLeaving((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, EXIT_MS);
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    const duration = toast.duration ?? DEFAULT_DURATION;
    if (duration > 0) {
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
    }

    return id;
  }, [dismiss]);

  const hideToast = useCallback((id: string) => dismiss(id), [dismiss]);

  const clearToasts = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setToasts([]);
    setLeaving({});
  }, []);

  const visible = toasts.slice(-MAX_VISIBLE);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearToasts }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2.5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-end sm:inset-x-auto sm:bottom-6 sm:right-6 sm:p-0"
      >
        {visible.map((toast) => {
          const Icon = icons[toast.type];
          const accent = accents[toast.type];
          const duration = toast.duration ?? DEFAULT_DURATION;
          const isLeaving = !!leaving[toast.id];
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
              className={cn(
                'group/toast pointer-events-auto relative flex w-full max-w-[400px] items-start gap-3 overflow-hidden rounded-2xl border p-3.5 pr-1.5 pt-1.5 shadow-xl backdrop-blur-md',
                'border-gray-200/80 bg-white/95 shadow-gray-900/10',
                'dark:border-gray-700/70 dark:bg-gray-800/95 dark:shadow-black/50',
                isLeaving ? 'animate-toast-out' : 'animate-toast-in'
              )}
            >
              {/* Icon chip màu theo loại */}
              <div
                className={cn(
                  'mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ring-1',
                  accent.chip
                )}
              >
                <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              </div>

              {/* Nội dung */}
              <div className="min-w-0 flex-1 pb-2 pt-1.5">
                <p className="text-sm font-semibold leading-snug break-words text-gray-900 dark:text-white">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="mt-0.5 text-[13px] leading-relaxed break-words text-gray-500 dark:text-gray-400">
                    {toast.message}
                  </p>
                )}
                {toast.action && <div className="mt-2">{toast.action}</div>}
              </div>

              {/* Đóng — mờ, đậm dần khi hover/focus */}
              <div className="flex flex-shrink-0 items-start pt-1">
                <button
                  type="button"
                  onClick={() => hideToast(toast.id)}
                  className="rounded-lg p-1.5 text-gray-400 opacity-60 transition-all hover:bg-gray-100 hover:text-gray-600 hover:opacity-100 focus-visible:opacity-100 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  aria-label="Đóng thông báo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Thanh đếm ngược thời gian tự đóng */}
              {duration > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-[3px]">
                  <div
                    className={cn(
                      'toast-progress-bar h-full rounded-b-2xl bg-gradient-to-r opacity-70',
                      accent.bar
                    )}
                    style={{ animationDuration: `${duration}ms` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
