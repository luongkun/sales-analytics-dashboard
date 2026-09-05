// API + types cho analytics lấy từ DB thật (backend /api/analytics).
import { api } from '../api';
import type {
  MonthlyRevenue,
  CategoryRevenue,
  RegionRevenue,
  TopProduct,
  OrderTrend,
  RecentOrder,
  OrderStatusData,
} from '../data/salesData';

export interface TopCustomer {
  rank: number;
  name: string;
  email: string;
  totalSpent: number;
  orders: number;
  memberSince: string;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  newCustomers: number;
  growthRate: number;
  previousRevenue: number;
  previousOrders: number;
  previousCustomers: number;
  previousGrowthRate: number;
}

export interface DailyRevenue {
  day: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface AnalyticsPayload {
  ok: boolean;
  generatedAt: number;
  summary: AnalyticsSummary;
  monthlyRevenue: MonthlyRevenue[];
  categoryRevenue: CategoryRevenue[];
  regionRevenue: RegionRevenue[];
  topProducts: TopProduct[];
  orderTrend: OrderTrend[];
  recentOrders: RecentOrder[];
  orderStatus: OrderStatusData[];
  topCustomers: TopCustomer[];
  customerStats: {
    total: number;
    newThisMonth: number;
    retentionRate: number;
  };
  acquisition: { source: string; value: number }[];
  quarterly: { quarter: string; thisYear: number; lastYear: number }[];
  orderStats: { total: number; completed: number; processing: number; canceled: number };
  year: {
    currentYear: number;
    yearRevenue: number;
    lastYearRevenue: number;
    avgPerMonth: number;
    target: number;
    targetPct: number;
    bestMonth: { label: string; revenue: number };
    aov: number;
    returnRate: number;
    completionRate: number;
  };
}

export interface DailyRevenueResponse {
  ok: boolean;
  month: string;
  daily: DailyRevenue[];
}

/** Lấy toàn bộ dữ liệu analytics (1 request duy nhất) */
export async function fetchAnalytics(): Promise<AnalyticsPayload> {
  return api<AnalyticsPayload>('/analytics');
}

/** Doanh thu theo ngày của 1 tháng (drill-down), month dạng 'T9/2026' */
export async function fetchDailyRevenue(month: string): Promise<DailyRevenue[]> {
  const res = await api<DailyRevenueResponse>(`/analytics/daily?month=${encodeURIComponent(month)}`);
  return res.daily || [];
}
