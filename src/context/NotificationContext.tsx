import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAnalytics } from '../lib/analytics';
import { formatCompact, formatRelative } from '../lib/formatters';
import type { Analytics } from '../lib/types';

export interface NotifItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  minutesAgo: number;
  linkTo: string;
}

interface NotificationValue {
  notifications: NotifItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationValue | undefined>(undefined);
const READ_KEY = 'notification-read-ids';

function buildNotifications(a: Analytics): NotifItem[] {
  const totalRevenue = a.summary?.totalRevenue ?? 0;
  const lastOrder = a.recentOrders?.[0];
  const lastMonth = a.monthlyRevenue?.[a.monthlyRevenue.length - 1];
  const prevMonth = a.monthlyRevenue?.[a.monthlyRevenue.length - 2];
  const monthRevenue = lastMonth?.revenue ?? 0;
  const percent =
    prevMonth && prevMonth.revenue > 0 ? Math.round(((monthRevenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;
  const cancelled = a.orderStats?.cancelled ?? 0;
  const totalOrders = a.orderStats?.total ?? 0;
  const cancelPct = totalOrders > 0 ? Math.round((cancelled / totalOrders) * 1000) / 10 : 0;

  return [
    {
      id: 'notif-revenue-record',
      type: 'success',
      title: `🎉 Doanh thu tháng ${formatCompact(monthRevenue)} lập kỷ lục mới!`,
      message: `Doanh thu tháng này tăng ${percent}% so với tháng trước.`,
      minutesAgo: 5,
      linkTo: 'revenue',
    },
    {
      id: 'notif-order-processing',
      type: 'info',
      title: `Đơn hàng ${lastOrder?.id ?? 'ORD-XXXXXX'} đang được xử lý`,
      message: `Sản phẩm: ${lastOrder?.product ?? '—'}. Shop sẽ hoàn tất ngay khi xong.`,
      minutesAgo: 25,
      linkTo: 'orders',
    },
    {
      id: 'notif-target-progress',
      type: 'success',
      title: 'Đã hoàn thành 85% mục tiêu quý',
      message: 'Bạn đang đi trước kế hoạch. Tiếp tục phát huy nhé!',
      minutesAgo: 120,
      linkTo: 'reports',
    },
    {
      id: 'notif-order-cancelled',
      type: 'error',
      title: `Đơn hàng ${lastOrder?.id ?? 'ORD-XXXXXX'} đã bị hủy`,
      message: `Khách hàng: ${lastOrder?.customer ?? '—'}. Vui lòng kiểm tra và liên hệ xác nhận.`,
      minutesAgo: 240,
      linkTo: 'orders',
    },
    {
      id: 'notif-return-rate',
      type: 'warning',
      title: 'Cảnh báo tỷ lệ hoàn trả',
      message: `${cancelled} đơn hàng bị trả lại (${cancelPct}%) trong tuần này.`,
      minutesAgo: 480,
      linkTo: 'reports',
    },
    {
      id: 'notif-monthly-report',
      type: 'info',
      title: 'Báo cáo tháng đã sẵn sàng',
      message: 'Báo cáo phân tích doanh thu tháng này đã được tạo. Xem tại trang Báo cáo.',
      minutesAgo: 1440,
      linkTo: 'reports',
    },
  ];
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data } = useAnalytics();
  const notifications = useMemo<NotifItem[]>(() => (data ? buildNotifications(data) : []), [data]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
    } catch {
      /* ignore */
    }
  }, [readIds]);

  const value: NotificationValue = {
    notifications,
    unreadCount: notifications.filter((n) => !readIds.has(n.id)).length,
    markAsRead: (id) => setReadIds((s) => new Set([...s, id])),
    markAllAsRead: () => setReadIds(() => new Set(notifications.map((n) => n.id))),
    clearAll: () => {
      setReadIds(() => new Set(notifications.map((n) => n.id)));
    },
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export { formatRelative };
