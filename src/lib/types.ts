// ===== Shared types (khớp API Task-51) =====

export interface VipTier {
  level: number;
  name: string;
  bonusPct: number;
}

export interface PublicUser {
  name: string;
  email: string;
  role: 'admin' | 'member';
  balance: number;
  userCode: number;
  purchasedUpgrades: string[];
  avatar: string | null;
  totalTopup: number;
  vipOverride: number | null;
  vip: VipTier | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  totalSlots: number;
  bookedSlots: number;
  gradient: string;
  icon: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price?: number;
}

export interface Order {
  id: string;
  email: string;
  items: OrderItem[];
  total: number;
  status: 'Hoàn thành' | 'Đang xử lý' | 'Đã hủy';
  timestamp: number;
}

export interface Analytics {
  generatedAt: number;
  year: number;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    newCustomers: number;
    growthRate: number;
    previousRevenue: number;
    previousOrders: number;
    previousCustomers: number;
    previousGrowthRate?: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  categoryRevenue: { category: string; revenue: number; percent: number }[];
  regionRevenue: { region: string; revenue: number; percent: number }[];
  topProducts: { id: string; name: string; sales: number; revenue: number; trend: number }[];
  orderTrend: { date: string; orders: number; revenue: number }[];
  recentOrders: {
    id: string;
    customer: string;
    product: string;
    amount: number;
    status: Order['status'];
    date: string;
  }[];
  orderStatus: { status: string; count: number; percent: number }[];
  orderStats: { total: number; completed: number; processing: number; cancelled: number };
}

export interface DailyPoint {
  day: string;
  revenue: number;
  orders: number;
  customers: number;
  topCustomer: string;
}

export interface PublicPayment {
  id: string;
  email: string;
  content: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  bank: { name: string; accountNo: string; accountName: string };
  qrPayload: string;
  bankQrUrl: string;
  momoQrUrl: string;
  result: CreditResult | null;
}

export interface CreditResult {
  balance: number;
  bonus: number;
  vipBonus: number;
  totalTopup: number;
  tierUp: { level: number; name: string } | null;
  simulated?: boolean;
}

export interface WebhookLog {
  id: number;
  ts: number;
  ip: string;
  provider: string;
  ok: 0 | 1;
  reason: string;
  content: string;
  amount: number;
}

export interface AdminPayment {
  id: string;
  email: string;
  content: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  result: CreditResult | null;
  providerRef: string;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export type ViewId =
  | 'overview'
  | 'revenue'
  | 'orders'
  | 'products'
  | 'customers'
  | 'reports'
  | 'upgrades'
  | 'admin'
  | 'profile'
  | 'topup'
  | 'myorders'
  | 'support'
  | 'aichat'
  | 'policy'
  | 'checkout';
