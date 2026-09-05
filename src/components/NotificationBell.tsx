import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellOff,
  X,
  CheckCheck,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useNotifications, Notification } from '../context/NotificationContext';
import { useI18n } from '../context/I18nContext';
import { cn } from '../utils/cn';

const typeIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeStyles = {
  success: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400 ring-1 ring-green-500/20 dark:ring-green-400/20',
  error: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400 ring-1 ring-red-500/20 dark:ring-red-400/20',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-amber-500/20 dark:ring-amber-400/20',
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 ring-1 ring-blue-500/20 dark:ring-blue-400/20',
};

function formatRelativeTime(timestamp: number, locale: string): string {
  const diff = timestamp - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const absDiff = Math.abs(diff);
  if (absDiff < 60 * 1000) return rtf.format(Math.round(diff / 1000), 'second');
  if (absDiff < 60 * 60 * 1000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (absDiff < 24 * 60 * 60 * 1000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
}

function NotificationItem({ notification, onNavigate }: { notification: Notification; onNavigate?: (page: string) => void }) {
  const { markAsRead, removeNotification } = useNotifications();
  const { t, locale } = useI18n();
  const Icon = typeIcons[notification.type];

  const handleClick = () => {
    markAsRead(notification.id);
    if (notification.linkTo && onNavigate) {
      onNavigate(notification.linkTo);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40',
        !notification.read && 'bg-blue-50/70 dark:bg-blue-500/10'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
      aria-label={t(notification.titleKey, notification.params)}
    >
      {/* Gạch dọc xanh đánh dấu chưa đọc */}
      {!notification.read && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-500 dark:bg-blue-400"
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          typeStyles[notification.type]
        )}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug',
            notification.read
              ? 'font-medium text-gray-700 dark:text-gray-200'
              : 'font-semibold text-gray-900 dark:text-white'
          )}
        >
          {t(notification.titleKey, notification.params)}
        </p>
        <p className="text-[13px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed line-clamp-2">
          {t(notification.messageKey, notification.params)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatRelativeTime(notification.timestamp, locale)}
        </p>
      </div>
      <div className="flex flex-col items-center gap-1">
        {!notification.read && (
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeNotification(notification.id);
          }}
          className="p-1 rounded text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-all focus:opacity-100"
          aria-label={t('notifications.remove')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationBell({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();
  const { t } = useI18n();

  useEffect(() => {
    const interval = setInterval(() => setTick((tick) => tick + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label={t('notifications.title')}
        aria-expanded={isOpen}
      >
        <Bell className={cn('w-5 h-5', isOpen && 'text-blue-600 dark:text-blue-400')} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in"
          role="dialog"
          aria-label={t('notifications.title')}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                {t('notifications.title')}
              </h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium ring-1 ring-blue-500/20 dark:ring-blue-400/20">
                  {t('notifications.unread_count', { count: unreadCount })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                  <BellOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('notifications.empty')}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onNavigate={(page) => {
                  setIsOpen(false);
                  onNavigate?.(page);
                }} />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:hover:no-underline disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('notifications.mark_all_read')}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('notifications.clear_all')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
