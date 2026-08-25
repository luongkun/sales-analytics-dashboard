// Dữ liệu doanh thu theo tháng
export const monthlyRevenue = [
  { month: 'T1', revenue: 245000000, orders: 1230, customers: 456 },
  { month: 'T2', revenue: 312000000, orders: 1450, customers: 523 },
  { month: 'T3', revenue: 287000000, orders: 1380, customers: 498 },
  { month: 'T4', revenue: 356000000, orders: 1620, customers: 587 },
  { month: 'T5', revenue: 398000000, orders: 1780, customers: 634 },
  { month: 'T6', revenue: 425000000, orders: 1890, customers: 672 },
  { month: 'T7', revenue: 467000000, orders: 2050, customers: 723 },
  { month: 'T8', revenue: 445000000, orders: 1950, customers: 698 },
  { month: 'T9', revenue: 512000000, orders: 2230, customers: 789 },
  { month: 'T10', revenue: 534000000, orders: 2340, customers: 823 },
  { month: 'T11', revenue: 623000000, orders: 2780, customers: 945 },
  { month: 'T12', revenue: 698000000, orders: 3120, customers: 1087 },
];

// Dữ liệu doanh thu theo danh mục sản phẩm
export const categoryRevenue = [
  { name: 'Điện tử', value: 2150000000, color: '#3b82f6' },
  { name: 'Thời trang', value: 1420000000, color: '#8b5cf6' },
  { name: 'Thực phẩm', value: 980000000, color: '#10b981' },
  { name: 'Gia dụng', value: 752000000, color: '#f59e0b' },
];

// Dữ liệu doanh thu theo khu vực
export const regionRevenue = [
  { region: 'Miền Bắc', q1: 420000000, q2: 510000000, q3: 480000000, q4: 620000000 },
  { region: 'Miền Trung', q1: 280000000, q2: 320000000, q3: 310000000, q4: 390000000 },
  { region: 'Miền Nam', q1: 560000000, q2: 640000000, q3: 610000000, q4: 780000000 },
];

// Sản phẩm bán chạy nhất
export const topProducts = [
  { rank: 1, name: 'iPhone 16 Pro Max', category: 'Điện tử', sold: 3245, revenue: 324500000 },
  { rank: 2, name: 'Samsung Galaxy S25', category: 'Điện tử', sold: 2890, revenue: 231200000 },
  { rank: 3, name: 'Áo khoác Uniqlo', category: 'Thời trang', sold: 5670, revenue: 170100000 },
  { rank: 4, name: 'MacBook Air M4', category: 'Điện tử', sold: 1234, revenue: 160420000 },
  { rank: 5, name: 'Nồi chiên không dầu', category: 'Gia dụng', sold: 4560, revenue: 136800000 },
  { rank: 6, name: 'Giày Nike Air Max', category: 'Thời trang', sold: 3890, revenue: 116700000 },
  { rank: 7, name: 'Combo thực phẩm sạch', category: 'Thực phẩm', sold: 6780, revenue: 101700000 },
  { rank: 8, name: 'Robot hút bụi Xiaomi', category: 'Gia dụng', sold: 1890, revenue: 94500000 },
];

// Xu hướng đơn hàng theo tuần (4 tuần gần nhất mỗi tháng cuối)
export const orderTrend = [
  { week: 'T10-W1', orders: 520, returns: 18 },
  { week: 'T10-W2', orders: 580, returns: 22 },
  { week: 'T10-W3', orders: 610, returns: 15 },
  { week: 'T10-W4', orders: 630, returns: 20 },
  { week: 'T11-W1', orders: 650, returns: 25 },
  { week: 'T11-W2', orders: 690, returns: 19 },
  { week: 'T11-W3', orders: 720, returns: 28 },
  { week: 'T11-W4', orders: 720, returns: 23 },
  { week: 'T12-W1', orders: 750, returns: 30 },
  { week: 'T12-W2', orders: 780, returns: 26 },
  { week: 'T12-W3', orders: 810, returns: 32 },
  { week: 'T12-W4', orders: 780, returns: 24 },
];

// Thống kê tổng quan
export const summaryStats = {
  totalRevenue: 5302000000,
  totalOrders: 23820,
  newCustomers: 8435,
  growthRate: 23.5,
  previousRevenue: 4293000000,
  previousOrders: 19450,
  previousCustomers: 6890,
  previousGrowthRate: 18.2,
};

// Helper format tiền VND
export const formatCurrency = (value) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)} tỷ`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)} triệu`;
  }
  return new Intl.NumberFormat('vi-VN').format(value);
};

// Helper format số
export const formatNumber = (value) => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

export const recentOrders = [
  { id: 'ORD-2851', customer: 'Nguyễn Văn An', product: 'iPhone 16 Pro Max', amount: 34990000, date: '25/12/2025', status: 'Hoàn thành' },
  { id: 'ORD-2850', customer: 'Trần Thị Bình', product: 'MacBook Air M4', amount: 32990000, date: '25/12/2025', status: 'Đang giao' },
  { id: 'ORD-2849', customer: 'Lê Hoàng Cường', product: 'Samsung Galaxy S25', amount: 27990000, date: '24/12/2025', status: 'Đang xử lý' },
  { id: 'ORD-2848', customer: 'Phạm Minh Duy', product: 'Áo khoác Uniqlo', amount: 1290000, date: '24/12/2025', status: 'Hoàn thành' },
  { id: 'ORD-2847', customer: 'Hoàng Thị Em', product: 'Nồi chiên không dầu', amount: 2590000, date: '24/12/2025', status: 'Hoàn thành' },
  { id: 'ORD-2846', customer: 'Vũ Đức Phong', product: 'Robot hút bụi Xiaomi', amount: 7990000, date: '23/12/2025', status: 'Đã hủy' },
  { id: 'ORD-2845', customer: 'Đỗ Thị Giang', product: 'Giày Nike Air Max', amount: 3890000, date: '23/12/2025', status: 'Đang giao' },
  { id: 'ORD-2844', customer: 'Bùi Thanh Hải', product: 'Combo thực phẩm sạch', amount: 890000, date: '23/12/2025', status: 'Hoàn thành' },
  { id: 'ORD-2843', customer: 'Ngô Thị Hương', product: 'iPhone 16 Pro Max', amount: 34990000, date: '22/12/2025', status: 'Hoàn thành' },
  { id: 'ORD-2842', customer: 'Mai Văn Khoa', product: 'Samsung Galaxy S25', amount: 27990000, date: '22/12/2025', status: 'Đang xử lý' },
];
