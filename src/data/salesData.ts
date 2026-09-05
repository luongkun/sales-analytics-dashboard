export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface CategoryRevenue {
  name: string;
  value: number;
  color: string;
}

export interface RegionRevenue {
  region: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export interface TopProduct {
  rank: number;
  name: string;
  category: string;
  sold: number;
  revenue: number;
}

export interface OrderTrend {
  week: string;
  orders: number;
  returns: number;
}

export interface RecentOrder {
  id: string;
  customer: string;
  product: string;
  amount: number;
  date: string;
  status: string;
}

export interface SummaryStats {
  totalRevenue: number;
  totalOrders: number;
  newCustomers: number;
  growthRate: number;
  previousRevenue: number;
  previousOrders: number;
  previousCustomers: number;
  previousGrowthRate: number;
}

export interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

// ============================================================
// Helpers đồng bộ thời gian hiện tại
// (dữ liệu luôn khớp tháng/tuần/ngày tại thời điểm mở app)
// ============================================================

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Ngày dạng 'DD/MM/YYYY' của hôm nay lùi n ngày */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** 12 nhãn tháng kết thúc ở THÁNG HIỆN TẠI, vd giờ là 9/2026 → ['T10/2025', …, 'T9/2026'] */
const last12MonthLabels = (): string[] => {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`T${d.getMonth() + 1}/${d.getFullYear()}`);
  }
  return labels;
};

/** 12 nhãn tuần kết thúc ở TUẦN HIỆN TẠI, vd ['T7-W3', …, 'T9-W2'] */
const last12WeekLabels = (): string[] => {
  const now = new Date();
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  anchor.setDate(anchor.getDate() + (6 - anchor.getDay())); // mốc: thứ Bảy của tuần này
  const labels: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7 * i);
    const weekOfMonth = Math.ceil(d.getDate() / 7);
    labels.push(`T${d.getMonth() + 1}-W${weekOfMonth}`);
  }
  return labels;
};

const monthLabels = last12MonthLabels();

const monthlyValues: Array<Omit<MonthlyRevenue, 'month'>> = [
  { revenue: 7600000, orders: 210, customers: 74 },
  { revenue: 8100000, orders: 225, customers: 78 },
  { revenue: 8900000, orders: 246, customers: 82 },
  { revenue: 9400000, orders: 260, customers: 85 },
  { revenue: 10500000, orders: 292, customers: 93 },
  { revenue: 11800000, orders: 327, customers: 101 },
  { revenue: 13100000, orders: 363, customers: 109 },
  { revenue: 14400000, orders: 400, customers: 117 },
  { revenue: 15800000, orders: 439, customers: 126 },
  { revenue: 17200000, orders: 478, customers: 134 },
  { revenue: 18500000, orders: 513, customers: 142 },
  { revenue: 19800000, orders: 550, customers: 150 },
];

export const monthlyRevenue: MonthlyRevenue[] = monthlyValues.map((v, i) => ({
  month: monthLabels[i],
  ...v,
}));

// Hệ thống chỉ bán duy nhất 1 sản phẩm: Netflix Trial 30 days (20.000đ).
export const categoryRevenue: CategoryRevenue[] = [
  { name: 'Giải trí', value: 289660000, color: '#ec4899' },
];

export const regionRevenue: RegionRevenue[] = [
  { region: 'Miền Bắc', q1: 24000000, q2: 29000000, q3: 27000000, q4: 35000000 },
  { region: 'Miền Trung', q1: 16000000, q2: 18000000, q3: 17500000, q4: 22000000 },
  { region: 'Miền Nam', q1: 32000000, q2: 36000000, q3: 34500000, q4: 44000000 },
];

export const topProducts: TopProduct[] = [
  { rank: 1, name: 'Netflix Trial 30 days', category: 'Giải trí', sold: 14483, revenue: 289660000 },
];

const weekLabels = last12WeekLabels();

const orderTrendValues: Array<Omit<OrderTrend, 'week'>> = [
  { orders: 92, returns: 4 },
  { orders: 98, returns: 5 },
  { orders: 104, returns: 3 },
  { orders: 108, returns: 6 },
  { orders: 112, returns: 5 },
  { orders: 118, returns: 7 },
  { orders: 121, returns: 4 },
  { orders: 124, returns: 6 },
  { orders: 128, returns: 8 },
  { orders: 132, returns: 5 },
  { orders: 138, returns: 9 },
  { orders: 130, returns: 4 },
];

export const orderTrend: OrderTrend[] = orderTrendValues.map((v, i) => ({
  week: weekLabels[i],
  ...v,
}));

export const summaryStats: SummaryStats = {
  totalRevenue: 289660000,
  totalOrders: 8033,
  newCustomers: 172,
  growthRate: 8.5,
  previousRevenue: 269000000,
  previousOrders: 7460,
  previousCustomers: 154,
  previousGrowthRate: 7.2,
};

export const formatCurrency = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)} tỷ`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)} triệu`;
  }
  return new Intl.NumberFormat('vi-VN').format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

export const recentOrders: RecentOrder[] = [
  { id: 'ORD-2851', customer: 'Nguyễn Văn An', product: 'Netflix Trial 30 days', amount: 40000, date: daysAgo(0), status: 'Hoàn thành' },
  { id: 'ORD-2850', customer: 'Trần Thị Bình', product: 'Netflix Trial 30 days', amount: 20000, date: daysAgo(0), status: 'Đang giao' },
  { id: 'ORD-2849', customer: 'Lê Hoàng Cường', product: 'Netflix Trial 30 days', amount: 40000, date: daysAgo(1), status: 'Đang xử lý' },
  { id: 'ORD-2848', customer: 'Phạm Minh Duy', product: 'Netflix Trial 30 days', amount: 20000, date: daysAgo(1), status: 'Hoàn thành' },
  { id: 'ORD-2847', customer: 'Hoàng Thị Em', product: 'Netflix Trial 30 days', amount: 40000, date: daysAgo(1), status: 'Hoàn thành' },
  { id: 'ORD-2846', customer: 'Vũ Đức Phong', product: 'Netflix Trial 30 days', amount: 20000, date: daysAgo(2), status: 'Đã hủy' },
  { id: 'ORD-2845', customer: 'Đỗ Thị Giang', product: 'Netflix Trial 30 days', amount: 40000, date: daysAgo(2), status: 'Đang giao' },
  { id: 'ORD-2844', customer: 'Bùi Thanh Hải', product: 'Netflix Trial 30 days', amount: 20000, date: daysAgo(2), status: 'Hoàn thành' },
  { id: 'ORD-2843', customer: 'Ngô Thị Hương', product: 'Netflix Trial 30 days', amount: 40000, date: daysAgo(3), status: 'Hoàn thành' },
  { id: 'ORD-2842', customer: 'Mai Văn Khoa', product: 'Netflix Trial 30 days', amount: 20000, date: daysAgo(3), status: 'Đang xử lý' },
];