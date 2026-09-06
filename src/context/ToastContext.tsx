import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleX, Info, TriangleAlert, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  closing?: boolean;
}

interface ToastValue {
  showToast: (t: { type: ToastType; title: string; message?: string; duration?: number }) => void;
  hideToast: (id: number) => void;
}

const ToastContext = createContext<ToastValue | undefined>(undefined);

const ICONS = {
  success: CheckCircle2,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
};

const ICON_COLOR = {
  success: 'text-emerald-500 bg-emerald-500/10',
  error: 'text-rose-500 bg-rose-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  info: 'text-sky-500 bg-sky-500/10',
};

const BAR_GRADIENT = {
  success: 'from-emerald-500 to-teal-400',
  error: 'from-rose-500 to-red-400',
  warning: 'from-amber-500 to-orange-400',
  info: 'from-sky-500 to-blue-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const hideToast = useCallback(
    (id: number) => {
      setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      setTimeout(() => removeToast(id), 260);
    },
    [removeToast],
  );

  const showToast = useCallback(
    ({ type, title, message, duration = 5000 }: { type: ToastType; title: string; message?: string; duration?: number }) => {
      const id = idRef.current++;
      setToasts((ts) => [...ts.slice(-2), { id, type, title, message, duration }]);
      setTimeout(() => hideToast(id), duration);
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} hideToast={hideToast} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, hideToast, removeToast }: { toasts: ToastItem[]; hideToast: (id: number) => void; removeToast: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2.5 p-3 pb-[env(safe-area-inset-bottom)] sm:items-end sm:bottom-6 sm:right-6"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
            className={`relative max-w-[400px] w-full sm:w-auto overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 p-3.5 shadow-xl backdrop-blur-md ${
              t.closing ? 'animate-toast-out' : 'animate-toast-in'
            }`}
            onAnimationEnd={(e) => {
              if (t.closing && e.animationName.includes('toast-out')) removeToast(t.id);
            }}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center ${ICON_COLOR[t.type]}`}>
                <Icon className="w-4.5 h-4.5" size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 break-words">{t.message}</p>}
              </div>
              <button
                onClick={() => hideToast(t.id)}
                aria-label="Đóng thông báo"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className={`absolute bottom-0 left-0 h-0.5 animate-toast-progress bg-gradient-to-r ${BAR_GRADIENT[t.type]}`} style={{ animationDuration: `${t.duration}ms` }} />
          </div>
        );
      })}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
