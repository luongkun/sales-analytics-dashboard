import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import {
  recentOrders,
  monthlyRevenue,
  orderTrend,
  formatCurrency,
} from '../data/salesData';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type NotificationLink = 'overview' | 'orders' | 'reports' | 'products' | 'customers' | 'revenue';

export interface Notification {
  id: string;
  type: NotificationType;
  titleKey: string;
  messageKey: string;
  params?: Record<string, string | number>;
  timestamp: number;
  read: boolean;
  linkTo?: NotificationLink;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const READ_KEY = 'notification-read-ids';

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const saved = localStorage.getItem(READ_KEY);
    return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

function buildInitialNotifications(readIds: Set<string>): Notification[] {
  const now = Date.now();
  const lastMonth = monthlyRevenue[monthlyRevenue.length - 1];
  const prevMonth = monthlyRevenue[monthlyRevenue.length - 2];
  const growthPercent = (((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100).toFixed(1);

  const cancelled = recentOrders.find((o) => o.status === 'Đã hủy');
  const shipping = recentOrders.find((o) => o.status === 'Đang giao');

  const q4Total =
    lastMonth.revenue + prevMonth.revenue + monthlyRevenue[monthlyRevenue.length - 3].revenue;
  const q4Target = 80_000_000;
  const targetPercent = Math.round((q4Total / q4Target) * 100);

  const lastWeek = orderTrend[orderTrend.length - 1];
  const returnPercent = ((lastWeek.returns / lastWeek.orders) * 100).toFixed(1);

  return [
    {
      id: 'notif-revenue-record',
      type: 'success',
      titleKey: 'notif.revenue_record.title',
      messageKey: 'notif.revenue_record.message',
      params: {
        revenue: formatCurrency(lastMonth.revenue),
        percent: growthPercent,
      },
      timestamp: now - 5 * MINUTE,
      read: readIds.has('notif-revenue-record'),
      linkTo: 'revenue',
    },
    {
      id: 'notif-order-shipping',
      type: 'info',
      titleKey: 'notif.order_shipping.title',
      messageKey: 'notif.order_shipping.message',
      params: shipping
        ? { id: shipping.id, product: shipping.product }
        : { id: '-', product: '-' },
      timestamp: now - 25 * MINUTE,
      read: readIds.has('notif-order-shipping'),
      linkTo: 'orders',
    },
    {
      id: 'notif-target-progress',
      type: 'success',
      titleKey: 'notif.target_progress.title',
      messageKey: 'notif.target_progress.message',
      params: { percent: targetPercent },
      timestamp: now - 2 * HOUR,
      read: readIds.has('notif-target-progress'),
      linkTo: 'reports',
    },
    {
      id: 'notif-order-cancelled',
      type: 'error',
      titleKey: 'notif.order_cancelled.title',
      messageKey: 'notif.order_cancelled.message',
      params: cancelled
        ? { id: cancelled.id, customer: cancelled.customer }
        : { id: '-', customer: '-' },
      timestamp: now - 4 * HOUR,
      read: readIds.has('notif-order-cancelled'),
      linkTo: 'orders',
    },
    {
      id: 'notif-return-rate',
      type: 'warning',
      titleKey: 'notif.return_rate.title',
      messageKey: 'notif.return_rate.message',
      params: { count: lastWeek.returns, percent: returnPercent },
      timestamp: now - 8 * HOUR,
      read: readIds.has('notif-return-rate'),
      linkTo: 'orders',
    },
    {
      id: 'notif-monthly-report',
      type: 'info',
      titleKey: 'notif.monthly_report.title',
      messageKey: 'notif.monthly_report.message',
      timestamp: now - 1 * DAY,
      read: readIds.has('notif-monthly-report'),
      linkTo: 'reports',
    },
  ];
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    buildInitialNotifications(loadReadIds())
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      if (prev.every((n) => n.read || n.id !== id)) return prev;
      const ids = loadReadIds();
      ids.add(id);
      saveReadIds(ids);
      return prev.map((n) => (n.id === id ? { ...n, read: true } : n));
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const ids = loadReadIds();
      prev.forEach((n) => ids.add(n.id));
      saveReadIds(ids);
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    const ids = loadReadIds();
    ids.add(id);
    saveReadIds(ids);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications((prev) => {
      const ids = loadReadIds();
      prev.forEach((n) => ids.add(n.id));
      saveReadIds(ids);
      return [];
    });
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
