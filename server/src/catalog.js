// Danh mục sản phẩm — hệ thống chỉ bán duy nhất 1 sản phẩm: Netflix Trial 30 days.
// 'weight' = tần suất xuất hiện trong đơn hàng khi seed (chỉ 1 sản phẩm nên luôn chọn nó).

export const PRODUCTS = [
  // Giải trí
  { id: 'PRD-NETFLIX', name: 'Netflix Trial 30 days', category: 'Giải trí', price: 20000, weight: 1 },
];

export const CATEGORY_COLORS = {
  'Giải trí': '#ec4899',
};

export const REGIONS = ['Miền Bắc', 'Miền Trung', 'Miền Nam'];
export const SOURCES = ['Website', 'Mobile App', 'Social Media', 'Giới thiệu'];