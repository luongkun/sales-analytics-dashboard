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
  { revenue: 245000000, orders: 1230, customers: 456 },
  { revenue: 312000000, orders: 1450, customers: 523 },
  { revenue: 287000000, orders: 1380, customers: 498 },
  { revenue: 356000000, orders: 1620, customers: 587 },
  { revenue: 398000000, orders: 1780, customers: 634 },
  { revenue: 425000000, orders: 1890, customers: 672 },
  { revenue: 467000000, orders: 2050, customers: 723 },
  { revenue: 445000000, orders: 1950, customers: 698 },
  { revenue: 512000000, orders: 2230, customers: 789 },
  { revenue: 534000000, orders: 2340, customers: 823 },
  { revenue: 623000000, orders: 2780, customers: 945 },
  { revenue: 698000000, orders: 3120, customers: 1087 },
];

export const monthlyRevenue: MonthlyRevenue[] = monthlyValues.map((v, i) => ({
  month: monthLabels[i],
  ...v,
}));

export const categoryRevenue: CategoryRevenue[] = [
  { name: 'Điện tử', value: 2150000000, color: '#3b82f6' },
  { name: 'Thời trang', value: 1420000000, color: '#8b5cf6' },
  { name: 'Thực phẩm', value: 980000000, color: '#10b981' },
  { name: 'Gia dụng', value: 752000000, color: '#f59e0b' },
];

export const regionRevenue: RegionRevenue[] = [
  { region: 'Miền Bắc', q1: 420000000, q2: 510000000, q3: 480000000, q4: 620000000 },
  { region: 'Miền Trung', q1: 280000000, q2: 320000000, q3: 310000000, q4: 390000000 },
  { region: 'Miền Nam', q1: 560000000, q2: 640000000, q3: 610000000, q4: 780000000 },
];

export const topProducts: TopProduct[] = [
  { rank: 1, name: 'iPhone 16 Pro Max', category: 'Điện tử', sold: 3245, revenue: 324500000 },
  { rank: 2, name: 'Samsung Galaxy S25', category: 'Điện tử', sold: 2890, revenue: 231200000 },
  { rank: 3, name: 'Áo khoác Uniqlo', category: 'Thời trang', sold: 5670, revenue: 170100000 },
  { rank: 4, name: 'MacBook Air M4', category: 'Điện tử', sold: 1234, revenue: 160420000 },
  { rank: 5, name: 'Nồi chiên không dầu', category: 'Gia dụng', sold: 4560, revenue: 136800000 },
  { rank: 6, name: 'Giày Nike Air Max', category: 'Thời trang', sold: 3890, revenue: 116700000 },
  { rank: 7, name: 'Combo thực phẩm sạch', category: 'Thực phẩm', sold: 6780, revenue: 101700000 },
  { rank: 8, name: 'Robot hút bụi Xiaomi', category: 'Gia dụng', sold: 1890, revenue: 94500000 },
];

const weekLabels = last12WeekLabels();

const orderTrendValues: Array<Omit<OrderTrend, 'week'>> = [
  { orders: 520, returns: 18 },
  { orders: 580, returns: 22 },
  { orders: 610, returns: 15 },
  { orders: 630, returns: 20 },
  { orders: 650, returns: 25 },
  { orders: 690, returns: 19 },
  { orders: 720, returns: 28 },
  { orders: 720, returns: 23 },
  { orders: 750, returns: 30 },
  { orders: 780, returns: 26 },
  { orders: 810, returns: 32 },
  { orders: 780, returns: 24 },
];

export const orderTrend: OrderTrend[] = orderTrendValues.map((v, i) => ({
  week: weekLabels[i],
  ...v,
}));

export const summaryStats: SummaryStats = {
  totalRevenue: 5302000000,
  totalOrders: 23820,
  newCustomers: 8435,
  growthRate: 23.5,
  previousRevenue: 4293000000,
  previousOrders: 19450,
  previousCustomers: 6890,
  previousGrowthRate: 18.2,
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
  { id: 'ORD-2851', customer: 'Nguyễn Văn An', product: 'iPhone 16 Pro Max', amount: 34990000, date: daysAgo(0), status: 'Hoàn thành' },
  { id: 'ORD-2850', customer: 'Trần Thị Bình', product: 'MacBook Air M4', amount: 32990000, date: daysAgo(0), status: 'Đang giao' },
  { id: 'ORD-2849', customer: 'Lê Hoàng Cường', product: 'Samsung Galaxy S25', amount: 27990000, date: daysAgo(1), status: 'Đang xử lý' },
  { id: 'ORD-2848', customer: 'Phạm Minh Duy', product: 'Áo khoác Uniqlo', amount: 1290000, date: daysAgo(1), status: 'Hoàn thành' },
  { id: 'ORD-2847', customer: 'Hoàng Thị Em', product: 'Nồi chiên không dầu', amount: 2590000, date: daysAgo(1), status: 'Hoàn thành' },
  { id: 'ORD-2846', customer: 'Vũ Đức Phong', product: 'Robot hút bụi Xiaomi', amount: 7990000, date: daysAgo(2), status: 'Đã hủy' },
  { id: 'ORD-2845', customer: 'Đỗ Thị Giang', product: 'Giày Nike Air Max', amount: 3890000, date: daysAgo(2), status: 'Đang giao' },
  { id: 'ORD-2844', customer: 'Bùi Thanh Hải', product: 'Combo thực phẩm sạch', amount: 890000, date: daysAgo(2), status: 'Hoàn thành' },
  { id: 'ORD-2843', customer: 'Ngô Thị Hương', product: 'iPhone 16 Pro Max', amount: 34990000, date: daysAgo(3), status: 'Hoàn thành' },
  { id: 'ORD-2842', customer: 'Mai Văn Khoa', product: 'Samsung Galaxy S25', amount: 27990000, date: daysAgo(3), status: 'Đang xử lý' },
];