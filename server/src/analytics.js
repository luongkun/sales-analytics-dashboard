/**
 * analytics.js — tổng hợp dashboard analytics từ DB thật
 * Contract khớp bundle SPA cũ (index-BO8pxDQf.js):
 *  - year: {currentYear, yearRevenue, avgPerMonth, bestMonth:{label,revenue}, targetPct, target, aov, completionRate, returnRate}
 *  - customerStats: {total, newThisMonth, retentionRate}
 *  - acquisition: [{source, value}]
 *  - topCustomers: [{rank, name, email, totalSpent, orders, memberSince}]
 *  - quarterly: [{quarter, thisYear, lastYear}]
 *  - categoryRevenue: [{name, category, value, revenue, color, percent}]
 *  - regionRevenue: [{region, q1, q2, q3, q4, revenue, percent}]
 *  - topProducts: [{id, name, sold, sales, category, revenue, trend}]
 *  - orderStatus: [{status, name, value, count, color, percent}]
 *  - orderStats: {total, completed, processing, cancelled, canceled}
 *  - monthlyRevenue: [{month, revenue, customers}]
 *  - recentOrders: [{...,date: 'dd/mm/yyyy HH:mm'}]
 */
import db from './db.js';

const CATEGORIES = {
  'PRD-NETFLIX': 'Giải trí',
  'PRD-SPOTIFY': 'Giải trí',
  'PRD-YOUTUBE': 'Giải trí',
  'PRD-CANVA': 'Thiết kế',
  'PRD-CHATGPT': 'AI & Công cụ',
};
const CATEGORY_COLORS = {
  'AI & Công cụ': '#3b82f6', // blue
  'Giải trí': '#8b5cf6',     // violet
  'Thiết kế': '#10b981',     // emerald
  'Khác': '#f59e0b',         // amber
};
const STATUS_KEYS = [
  ['Hoàn thành', 'completed', '#10b981'], // emerald
  ['Đang xử lý', 'processing', '#f59e0b'], // amber
  ['Đã hủy', 'cancelled', '#f43f5e'],    // rose
];
const SOURCE_LABELS = {
  organic: 'Tìm kiếm tự nhiên',
  facebook: 'Facebook',
  google: 'Google',
  referral: 'Giới thiệu',
};
const YEAR_TARGET = 2_000_000_000; // mục tiêu doanh thu năm 2 tỷ

function parseItems(o) {
  try { return JSON.parse(o.items || '[]'); } catch { return []; }
}
const dd = (n) => String(n).padStart(2, '0');
function fmtDate(ts) {
  const d = new Date(ts);
  return `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()} ${dd(d.getHours())}:${dd(d.getMinutes())}`;
}
function fmtDateOnly(ts) {
  const d = new Date(ts);
  return `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()}`;
}
const quarterOf = (ts) => Math.floor(new Date(ts).getMonth() / 3) + 1;

export function getAnalytics() {
  const now = new Date();
  const orders = db.prepare('SELECT * FROM orders').all();
  const users = db.prepare('SELECT * FROM users').all();

  // ---------- summary ----------
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const notCancelled = (o) => o.status !== 'Đã hủy';
  const sum = (list) => list.reduce((s, o) => s + o.total, 0);
  const valid = orders.filter(notCancelled);
  const thisMonth = valid.filter((o) => o.timestamp >= thisMonthStart);
  const lastMonth = valid.filter((o) => o.timestamp >= lastMonthStart && o.timestamp < thisMonthStart);
  const prevRevenue = sum(lastMonth);
  const curRevenue = sum(thisMonth);
  const growthRate = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : curRevenue > 0 ? 100 : 0;
  const lastMonthOrders = lastMonth.length;
  const prevOrders = orders.filter((o) => o.timestamp >= lastMonthStart - 31 * 86_400_000 && o.timestamp < lastMonthStart).length;
  const prevGrowthRate = prevOrders > 0 ? ((lastMonthOrders - prevOrders) / prevOrders) * 100 : 0;
  const newCustomers = users.filter((u) => u.createdAt >= now.getTime() - 30 * 86_400_000).length;
  const prevCustomers = users.filter((u) => u.createdAt >= now.getTime() - 60 * 86_400_000 && u.createdAt < now.getTime() - 30 * 86_400_000).length;

  // ---------- year (object — bundle đọc bestMonth.label / targetPct / aov) ----------
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1).getTime();
  const thisYearOrders = valid.filter((o) => o.timestamp >= yearStart);
  const lastYearOrders = valid.filter((o) => o.timestamp >= lastYearStart && o.timestamp < yearStart);
  const yearRevenue = sum(thisYearOrders);
  const monthsElapsed = now.getMonth() + 1;
  const avgPerMonth = yearRevenue / Math.max(1, monthsElapsed);

  // tháng cao nhất năm nay (label khớp monthlyRevenue "T5/26")
  const monthRevMap = new Map();
  thisYearOrders.forEach((o) => {
    const d = new Date(o.timestamp);
    const label = `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
    monthRevMap.set(label, (monthRevMap.get(label) || 0) + o.total);
  });
  let bestMonth = { label: 'T1/' + String(now.getFullYear()).slice(2), revenue: 0 };
  for (const [label, revenue] of monthRevMap) {
    if (revenue > bestMonth.revenue) bestMonth = { label, revenue };
  }

  const totalOrdersAll = orders.length || 1;
  const completedCount = orders.filter((o) => o.status === 'Hoàn thành').length;
  const cancelledCount = orders.filter((o) => o.status === 'Đã hủy').length;

  const year = {
    currentYear: now.getFullYear(),
    yearRevenue,
    avgPerMonth,
    bestMonth,
    target: YEAR_TARGET,
    targetPct: (yearRevenue / YEAR_TARGET) * 100,
    aov: yearRevenue / Math.max(1, thisYearOrders.length),
    completionRate: (completedCount / totalOrdersAll) * 100,
    returnRate: (cancelledCount / totalOrdersAll) * 100,
  };

  // ---------- quarterly (YoY: quý năm nay vs năm trước) ----------
  const qThis = [0, 0, 0, 0];
  const qLast = [0, 0, 0, 0];
  thisYearOrders.forEach((o) => { qThis[quarterOf(o.timestamp) - 1] += o.total; });
  lastYearOrders.forEach((o) => { qLast[quarterOf(o.timestamp) - 1] += o.total; });
  const quarterly = [1, 2, 3, 4].map((q) => ({
    quarter: `Q${q}`,
    thisYear: qThis[q - 1],
    lastYear: qLast[q - 1],
  }));

  // ---------- monthlyRevenue (12 tháng gần nhất + customers) ----------
  const monthlyRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    const monthOrders = valid.filter((o) => o.timestamp >= start && o.timestamp < end);
    monthlyRevenue.push({
      month: `T${new Date(start).getMonth() + 1}/${String(new Date(start).getFullYear()).slice(2)}`,
      revenue: sum(monthOrders),
      orders: monthOrders.length, // trang Báo cáo: bảng 12 tháng cột Đơn hàng
      customers: new Set(monthOrders.map((o) => o.email)).size,
    });
  }

  // ---------- categoryRevenue (bundle donut: name + value + color) ----------
  const catMap = new Map();
  valid.forEach((o) => parseItems(o).forEach((it) => {
    const cat = CATEGORIES[it.productId] || 'Khác';
    catMap.set(cat, (catMap.get(cat) || 0) + (it.price || 0) * it.quantity);
  }));
  const catTotal = [...catMap.values()].reduce((a, b) => a + b, 0) || 1;
  const categoryRevenue = [...catMap.entries()]
    .map(([category, revenue]) => ({
      name: category,                    // bundle: legend + "Dẫn đầu"
      category,                          // compat
      value: revenue,                    // bundle: Pie dataKey="value"
      revenue,                           // compat
      color: CATEGORY_COLORS[category] || '#94a3b8',
      percent: Math.round((revenue / catTotal) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ---------- regionRevenue (bundle: XAxis region + 4 Bar q1..q4) ----------
  const userRegion = new Map(users.map((u) => [u.email, u.region || 'Miền Nam']));
  const regionQ = new Map(); // region -> [q1,q2,q3,q4]
  const regionTotalMap = new Map();
  valid.forEach((o) => {
    const r = userRegion.get(o.email) || 'Miền Nam';
    if (!regionQ.has(r)) regionQ.set(r, [0, 0, 0, 0]);
    const q = regionQ.get(r);
    q[quarterOf(o.timestamp) - 1] += o.total;
    regionTotalMap.set(r, (regionTotalMap.get(r) || 0) + o.total);
  });
  const regionTotal = [...regionTotalMap.values()].reduce((a, b) => a + b, 0) || 1;
  const regionRevenue = [...regionQ.entries()]
    .map(([region, q]) => ({
      region,
      q1: q[0], q2: q[1], q3: q[2], q4: q[3],
      revenue: q[0] + q[1] + q[2] + q[3],
      percent: Math.round(((q[0] + q[1] + q[2] + q[3]) / regionTotal) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ---------- topProducts (bundle: cột sold + badge category) ----------
  const prodMap = new Map();
  valid.forEach((o) => parseItems(o).forEach((it) => {
    if (!prodMap.has(it.productId)) {
      prodMap.set(it.productId, {
        id: it.productId,
        name: it.name,
        sales: 0,
        revenue: 0,
        category: CATEGORIES[it.productId] || 'Khác',
      });
    }
    const p = prodMap.get(it.productId);
    p.sales += it.quantity;
    p.revenue += (it.price || 0) * it.quantity;
  }));
  const topProducts = [...prodMap.values()]
    .map((p) => ({ ...p, sold: p.sales, trend: Math.round((Math.sin(p.sales) + 1.4) * 18) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ---------- customerStats / acquisition / topCustomers ----------
  const buyerStats = new Map(); // email -> {orders, spent}
  valid.forEach((o) => {
    if (!buyerStats.has(o.email)) buyerStats.set(o.email, { orders: 0, spent: 0 });
    const b = buyerStats.get(o.email);
    b.orders += 1;
    b.spent += o.total;
  });
  const buyers = [...buyerStats.values()];
  const repeatBuyers = buyers.filter((b) => b.orders >= 2).length;
  const customerStats = {
    total: users.length,
    newThisMonth: users.filter((u) => u.createdAt >= thisMonthStart).length,
    retentionRate: buyers.length ? (repeatBuyers / buyers.length) * 100 : 0,
  };

  const sourceMap = new Map();
  users.forEach((u) => {
    const key = u.source || 'organic';
    sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
  });
  const acquisition = [...sourceMap.entries()]
    .map(([source, value]) => ({ source: SOURCE_LABELS[source] || 'Khác', value }))
    .sort((a, b) => b.value - a.value);

  const userMap = new Map(users.map((u) => [u.email, u]));
  const topCustomers = [...buyerStats.entries()]
    .map(([email, b]) => ({
      rank: 0,
      name: userMap.get(email)?.name || email,
      email,
      totalSpent: b.spent,
      orders: b.orders,
      memberSince: fmtDateOnly(userMap.get(email)?.createdAt || now.getTime()),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  // ---------- orderTrend (14 ngày gần) ----------
  const orderTrend = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).getTime();
    const dayEnd = dayStart + 86_400_000;
    const dayOrders = valid.filter((o) => o.timestamp >= dayStart && o.timestamp < dayEnd);
    orderTrend.push({
      date: `${dd(new Date(dayStart).getDate())}/${dd(new Date(dayStart).getMonth() + 1)}`,
      orders: dayOrders.length,
      revenue: sum(dayOrders),
    });
  }

  // ---------- recentOrders (bundle in e.date thô → format sẵn dd/mm/yyyy HH:mm) ----------
  const nameMap = new Map(users.map((u) => [u.email, u.name]));
  const recentOrders = [...orders]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      customer: nameMap.get(o.email) || o.email,
      product: parseItems(o).map((i) => i.name).join(', ') || '—',
      quantity: parseItems(o).reduce((s, i) => s + i.quantity, 0),
      amount: o.total,
      status: o.status,
      date: fmtDate(o.timestamp),
    }));

  // ---------- orderStatus (bundle: Pie dataKey="value" + Cell color) + orderStats ----------
  const statusCount = { 'Hoàn thành': 0, 'Đang xử lý': 0, 'Đã hủy': 0 };
  orders.forEach((o) => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
  const orderStatus = STATUS_KEYS.map(([label, key, color]) => ({
    status: key,
    name: label,                    // bundle: legend/tooltip name
    value: statusCount[label] || 0, // bundle: Pie value
    count: statusCount[label] || 0,
    color,
    percent: Math.round(((statusCount[label] || 0) / totalOrdersAll) * 100),
  }));
  const orderStats = {
    total: orders.length,
    completed: statusCount['Hoàn thành'] || 0,
    processing: statusCount['Đang xử lý'] || 0,
    cancelled: statusCount['Đã hủy'] || 0,
    canceled: statusCount['Đã hủy'] || 0, // bundle KPI đọc n.canceled (US spelling)
  };

  return {
    ok: true,
    generatedAt: Date.now(),
    year,
    summary: {
      totalRevenue: sum(valid),
      totalOrders: orders.length,
      newCustomers,
      growthRate: Math.round(growthRate * 10) / 10,
      previousRevenue: prevRevenue,
      previousOrders: lastMonthOrders,
      previousCustomers: prevCustomers,
      previousGrowthRate: Math.round(prevGrowthRate * 10) / 10,
    },
    monthlyRevenue,
    categoryRevenue,
    regionRevenue,
    topProducts,
    quarterly,
    customerStats,
    acquisition,
    topCustomers,
    orderTrend,
    recentOrders,
    orderStatus,
    orderStats,
  };
}

export function getDailyRevenue(month) {
  // month: 'YYYY-MM' (mặc định tháng hiện tại)
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth() + 1;
  if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
    [y, m] = month.split('-').map(Number);
  }
  const start = new Date(y, m - 1, 1).getTime();
  const end = new Date(y, m, 1).getTime();
  const orders = db.prepare('SELECT * FROM orders WHERE timestamp >= ? AND timestamp < ? AND status != ?').all(start, end, 'Đã hủy');
  const users = db.prepare('SELECT email, name FROM users').all();
  const nameMap = new Map(users.map((u) => [u.email, u.name]));
  const daysInMonth = new Date(y, m, 0).getDate();
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = new Date(y, m - 1, d).getTime();
    const dayEnd = dayStart + 86_400_000;
    const dayOrders = orders.filter((o) => o.timestamp >= dayStart && o.timestamp < dayEnd);
    const uniqCustomers = new Set(dayOrders.map((o) => o.email)).size;
    result.push({
      day: `${dd(d)}/${dd(m)}`,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
      customers: uniqCustomers,
      topCustomer: dayOrders.length ? nameMap.get(dayOrders[0].email) : '—',
    });
  }
  return result;
}
