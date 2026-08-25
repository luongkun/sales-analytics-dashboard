# 📊 Sales Analytics Dashboard

Dashboard phân tích doanh thu được xây dựng bằng **React**, **Tailwind CSS** và **Recharts**.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)

## ✨ Tính năng

- 📈 **Biểu đồ tương tác** - Area, Pie, Bar, Line charts với tooltip
- 📊 **Thống kê tổng quan** - Doanh thu, đơn hàng, khách hàng, tăng trưởng
- 🏆 **Top sản phẩm** - Bảng xếp hạng sản phẩm bán chạy
- 🗺️ **Phân tích khu vực** - So sánh doanh thu theo vùng miền
- 📱 **Responsive** - Tương thích desktop, tablet, mobile

## 🚀 Cài đặt

```bash
# Clone repo
git clone https://github.com/luongkun/sales-analytics-dashboard.git
cd sales-analytics-dashboard

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

## 🛠️ Tech Stack

| Công nghệ | Mục đích |
|---|---|
| [Vite](https://vite.dev) | Build tool |
| [React](https://react.dev) | UI framework |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Recharts](https://recharts.org) | Biểu đồ |
| [Lucide React](https://lucide.dev) | Icons |

## 📁 Cấu trúc dự án

```
src/
├── components/
│   ├── Layout.jsx          # Layout chính + sidebar
│   ├── StatCard.jsx         # Card thống kê
│   ├── RevenueChart.jsx     # Biểu đồ doanh thu (Area)
│   ├── CategoryChart.jsx    # Biểu đồ danh mục (Pie)
│   ├── RegionChart.jsx      # Biểu đồ khu vực (Bar)
│   ├── TopProducts.jsx      # Bảng sản phẩm bán chạy
│   └── OrderTrendChart.jsx  # Xu hướng đơn hàng (Line)
├── data/
│   └── salesData.js         # Dữ liệu mẫu
├── App.jsx                  # Component chính
├── main.jsx                 # Entry point
└── index.css                # Tailwind CSS
```

## 📄 License

MIT
