// Danh mục sản phẩm demo dùng cho seed dữ liệu + phân tích analytics.
// 'weight' = tần suất xuất hiện trong đơn hàng khi seed (càng cao càng phổ thông).

export const PRODUCTS = [
  // Điện tử
  { id: 'PRD-IP16PM', name: 'iPhone 16 Pro Max', category: 'Điện tử', price: 34990000, weight: 0.35 },
  { id: 'PRD-SGS25', name: 'Samsung Galaxy S25', category: 'Điện tử', price: 27990000, weight: 0.4 },
  { id: 'PRD-MBAM4', name: 'MacBook Air M4', category: 'Điện tử', price: 32990000, weight: 0.25 },
  { id: 'PRD-TV55', name: 'Tivi Samsung 55"', category: 'Điện tử', price: 15990000, weight: 0.3 },
  { id: 'PRD-AWSE', name: 'Apple Watch SE', category: 'Điện tử', price: 9490000, weight: 0.4 },
  { id: 'PRD-APP2', name: 'AirPods Pro 2', category: 'Điện tử', price: 5990000, weight: 0.5 },
  // Thời trang
  { id: 'PRD-AOK', name: 'Áo khoác Uniqlo', category: 'Thời trang', price: 1290000, weight: 5 },
  { id: 'PRD-NAM', name: 'Giày Nike Air Max', category: 'Thời trang', price: 3890000, weight: 3.5 },
  { id: 'PRD-ATB', name: 'Áo thun basic', category: 'Thời trang', price: 250000, weight: 10 },
  { id: 'PRD-JLV', name: 'Quần jeans Levi\'s', category: 'Thời trang', price: 1990000, weight: 4 },
  // Thực phẩm
  { id: 'PRD-CTPS', name: 'Combo thực phẩm sạch', category: 'Thực phẩm', price: 890000, weight: 7 },
  { id: 'PRD-CPRX', name: 'Cà phê rang xay 250g', category: 'Thực phẩm', price: 189000, weight: 9 },
  { id: 'PRD-HDRM', name: 'Hạt điều rang muối 300g', category: 'Thực phẩm', price: 245000, weight: 8 },
  // Gia dụng
  { id: 'PRD-NCND', name: 'Nồi chiên không dầu', category: 'Gia dụng', price: 2590000, weight: 4 },
  { id: 'PRD-RBVX', name: 'Robot hút bụi Xiaomi', category: 'Gia dụng', price: 7990000, weight: 2 },
  // Giải trí
  { id: 'PRD-NETFLIX', name: 'Netflix Trial 30 days', category: 'Giải trí', price: 20000, weight: 12 },
];

export const CATEGORY_COLORS = {
  'Điện tử': '#3b82f6',
  'Thời trang': '#8b5cf6',
  'Thực phẩm': '#10b981',
  'Gia dụng': '#f59e0b',
  'Giải trí': '#ec4899',
};

export const REGIONS = ['Miền Bắc', 'Miền Trung', 'Miền Nam'];
export const SOURCES = ['Website', 'Mobile App', 'Social Media', 'Giới thiệu'];
