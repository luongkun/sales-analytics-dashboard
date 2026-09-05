// Tổng hợp analytics từ SQLite — mọi con số trên dashboard đều từ DB thật.
// Chạy lại seed.js (server/src/seed.js) nếu muốn làm mới dữ liệu lịch sử demo.

import db from './db.js';
import { PRODUCTS, CATEGORY_COLORS } from './catalog.js';

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const DAY = 86400000;

/** 24 bucket tháng kết thúc ở tháng hiện tại */
function monthBuckets(count = 24) {
  const now = new Date();
  const arr = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    arr.push({
      key: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}`,
      label: `T${start.getMonth() + 1}/${start.getFullYear()}`,
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      start: start.getTime(),
      end: end.getTime() - 1,
      revenue: 0,
      orders: 0,
      customers: new Set(),
    });
  }
  return arr;
}

/** 12 bucket tuần kết thúc ở tuần hiện tại (mốc thứ Bảy) */
function weekBuckets(count = 12) {
  const now = new Date();
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  anchor.setDate(anchor.getDate() + (6 - anchor.getDay()));
  const arr = [];
  for (let i = count - 1; i >= 0; i--) {
    const end = new Date(anchor);
    end.setDate(end.getDate() - 7 * i);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    arr.push({
      label: `T${end.getMonth() + 1}-W${Math.ceil(end.getDate() / 7)}`,
      start: start.getTime(),
      end: end.getTime(),
      orders: 0,
      returns: 0,
    });
  }
  return arr;
}

export function getAnalytics() {
  const now = Date.now();
  const buckets24 = monthBuckets(24);
  const months12 = buckets24.slice(-12);
  const weeks = weekBuckets(12);

  // ---------- Quét toàn bộ đơn 1 lượt ----------
  const orders = db.prepare('SELECT id, email, items, total, status, timestamp FROM orders').all();

  const productAgg = new Map(); // name -> {name, category, sold, revenue}
  const catAgg = new Map(); // category -> value
  const catMeta = new Map(); // productId -> product meta
  for (const p of PRODUCTS) {
    catMeta.set(p.id, p);
    catMeta.set(p.name, p);
  }

  for (const o of orders) {
    // tháng
    let b = null;
    for (const m of buckets24) {
      if (o.timestamp >= m.start && o.timestamp <= m.end) { b = m; break; }
    }
    if (b) {
      b.revenue += o.total;
      b.orders += 1;
      b.customers.add(o.email);
    }
    // tuần
    for (const w of weeks) {
      if (o.timestamp >= w.start && o.timestamp <= w.end) {
        w.orders += 1;
        if (o.status === 'Đã hủy') w.returns += 1;
        break;
      }
    }
    // sản phẩm & danh mục
    let items = [];
    try { items = JSON.parse(o.items || '[]'); } catch { /* bỏ qua dòng lỗi */ }
    for (const it of items) {
      const meta = catMeta.get(it.productId) || catMeta.get(it.name);
      const name = it.name || (meta ? meta.name : 'Sản phẩm');
      const category = meta ? meta.category : 'Khác';
      const sold = it.quantity || 1;
      const revenue = (it.price || 0) * sold;
      const cur = productAgg.get(name) || { name, category, sold: 0, revenue: 0 };
      cur.sold += sold;
      cur.revenue += revenue;
      productAgg.set(name, cur);
      catAgg.set(category, (catAgg.get(category) || 0) + revenue);
    }
  }

  // ---------- Khu vực (quý của năm hiện tại, join users.region) ----------
  const currentYear = new Date().getFullYear();
  const regionRows = db.prepare(
    `SELECT u.region AS region,
            CAST(strftime('%m', o.timestamp / 1000, 'unixepoch') AS INTEGER) AS m,
            SUM(o.total) AS revenue
     FROM orders o JOIN users u ON u.email = o.email
     WHERE o.timestamp >= ? AND o.timestamp < ?
     GROUP BY u.region, m`
  ).all(new Date(currentYear, 0, 1).getTime(), Date.now());
  const regionMap = new Map();
  for (const r of regionRows) {
    const region = r.region || 'Khác';
    if (!regionMap.has(region)) regionMap.set(region, { region, q1: 0, q2: 0, q3: 0, q4: 0 });
    const q = Math.ceil(r.m / 3);
    regionMap.get(region)[`q${q}`] += r.revenue;
  }
  // luôn giữ 3 miền chính (kể cả 0), thêm "Khác" nếu có dữ liệu
  const regionRevenue = ['Miền Nam', 'Miền Bắc', 'Miền Trung']
    .map((rg) => regionMap.get(rg) || { region: rg, q1: 0, q2: 0, q3: 0, q4: 0 });
  if (regionMap.has('Khác') && regionMap.get('Khác').q1 + regionMap.get('Khác').q2 + regionMap.get('Khác').q3 + regionMap.get('Khác').q4 > 0) {
    regionRevenue.push(regionMap.get('Khác'));
  }

  // ---------- Khách hàng ----------
  const totalCustomers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'member'").get().c;
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = db.prepare('SELECT COUNT(*) AS c FROM users WHERE createdAt >= ?').get(monthStart.getTime()).c;

  const topCustomers = db.prepare(
    `SELECT u.name AS name, u.email AS email, u.createdAt AS createdAt,
            SUM(o.total) AS spent, COUNT(*) AS cnt
     FROM orders o JOIN users u ON u.email = o.email
     GROUP BY o.email ORDER BY spent DESC LIMIT 8`
  ).all().map((r, i) => ({
    rank: i + 1,
    name: r.name || r.email,
    email: r.email,
    totalSpent: r.spent,
    orders: r.cnt,
    memberSince: String(new Date(r.createdAt).getFullYear()),
  }));

  // giữ chân: trong 90 ngày, % khách có ≥2 đơn
  const active90 = db.prepare(
    'SELECT email, COUNT(*) AS c FROM orders WHERE timestamp >= ? GROUP BY email'
  ).all(now - 90 * DAY);
  const activeCount = active90.length;
  const returning = active90.filter((r) => r.c >= 2).length;

  // nguồn khách
  const acquisition = db.prepare('SELECT source, COUNT(*) AS c FROM users GROUP BY source').all();
  const acqMap = new Map([
    ['Website', 0], ['Mobile App', 0], ['Social Media', 0], ['Giới thiệu', 0],
  ]);
  for (const a of acquisition) {
    const key = a.source && acqMap.has(a.source) ? a.source : 'Website';
    acqMap.set(key, acqMap.get(key) + a.c);
  }

  // ---------- Tổng quan ----------
  const allRevenue = orders.reduce((s, o) => s + o.total, 0);
  const rev30 = orders.filter((o) => o.timestamp >= now - 30 * DAY).reduce((s, o) => s + o.total, 0);
  const revPrior30 = orders.filter((o) => o.timestamp >= now - 60 * DAY && o.timestamp < now - 30 * DAY).reduce((s, o) => s + o.total, 0);
  const revPriorPrior30 = orders.filter((o) => o.timestamp >= now - 90 * DAY && o.timestamp < now - 60 * DAY).reduce((s, o) => s + o.total, 0);
  const orders30 = orders.filter((o) => o.timestamp >= now - 30 * DAY).length;
  const newCust30 = db.prepare('SELECT COUNT(*) AS c FROM users WHERE createdAt >= ? AND createdAt < ?').get(now - 30 * DAY, now).c;
  const newCustPrior30 = db.prepare('SELECT COUNT(*) AS c FROM users WHERE createdAt >= ? AND createdAt < ?').get(now - 60 * DAY, now - 30 * DAY).c;
  const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);

  // ---------- Đơn hàng theo trạng thái ----------
  const statusRows = db.prepare('SELECT status, COUNT(*) AS c FROM orders GROUP BY status').all();
  const STATUS_COLORS = { 'Hoàn thành': '#10b981', 'Đang xử lý': '#f59e0b', 'Đang giao': '#3b82f6', 'Đã hủy': '#ef4444' };
  const orderStatus = statusRows
    .filter((r) => r.status)
    .map((r) => ({ name: r.status, value: r.c, color: STATUS_COLORS[r.status] || '#9ca3af' }))
    .sort((a, b) => b.value - a.value);
  const totalOrders = orders.length;
  const completed = orderStatus.find((s) => s.name === 'Hoàn thành')?.value || 0;
  const canceled = orderStatus.find((s) => s.name === 'Đã hủy')?.value || 0;
  const processing = totalOrders - completed - canceled;

  // ---------- Đơn gần đây ----------
  const recentRows = db.prepare(
    `SELECT o.id AS id, o.items AS items, o.total AS total, o.status AS status,
            o.timestamp AS timestamp, u.name AS name, u.email AS email
     FROM orders o LEFT JOIN users u ON u.email = o.email
     ORDER BY o.timestamp DESC LIMIT 10`
  ).all().map((r) => {
    let items = [];
    try { items = JSON.parse(r.items || '[]'); } catch { /* ignore */ }
    const first = items[0];
    const extra = items.length > 1 ? ` +${items.length - 1}` : '';
    return {
      id: r.id,
      customer: r.name || r.email,
      product: (first ? first.name : '—') + extra,
      amount: r.total,
      date: fmtDate(r.timestamp),
      status: r.status || 'Hoàn thành',
    };
  });
  const recentOrders = recentRows;

  // ---------- Năm hiện tại ----------
  const yearBuckets = buckets24.filter((b) => b.year === currentYear);
  const lastYearBuckets = buckets24.filter((b) => b.year === currentYear - 1);
  const yearRevenue = yearBuckets.reduce((s, b) => s + b.revenue, 0);
  const lastYearRevenue = lastYearBuckets.reduce((s, b) => s + b.revenue, 0);
  const monthsWithRevenue = months12.filter((b) => b.orders > 0).length || 1;
  const bestBucket = months12.reduce((a, b) => (b.revenue > a.revenue ? b : a), months12[0] || { label: '—', revenue: 0 });
  const target = Math.max(Math.round(lastYearRevenue * 1.15), 1000000);

  const quarterly = [1, 2, 3, 4].map((q) => ({
    quarter: `Q${q}`,
    thisYear: yearBuckets.filter((b) => Math.ceil(b.month / 3) === q).reduce((s, b) => s + b.revenue, 0),
    lastYear: lastYearBuckets.filter((b) => Math.ceil(b.month / 3) === q).reduce((s, b) => s + b.revenue, 0),
  }));

  return {
    ok: true,
    generatedAt: now,
    summary: {
      totalRevenue: allRevenue,
      totalOrders,
      newCustomers: newCust30,
      growthRate: pct(rev30, revPrior30),
      previousRevenue: allRevenue - rev30, // "tổng" tại 30 ngày trước
      previousOrders: totalOrders - orders30,
      previousCustomers: newCustPrior30,
      previousGrowthRate: pct(revPrior30, revPriorPrior30),
    },
    monthlyRevenue: months12.map((b) => ({
      month: b.label,
      revenue: b.revenue,
      orders: b.orders,
      customers: b.customers.size,
    })),
    categoryRevenue: [...catAgg.entries()]
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || '#9ca3af' }))
      .sort((a, b) => b.value - a.value),
    regionRevenue,
    topProducts: [...productAgg.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((p, i) => ({ rank: i + 1, name: p.name, category: p.category, sold: p.sold, revenue: Math.round(p.revenue) })),
    orderTrend: weeks.map((w) => ({ week: w.label, orders: w.orders, returns: w.returns })),
    recentOrders,
    orderStatus,
    topCustomers,
    customerStats: {
      total: totalCustomers,
      newThisMonth,
      retentionRate: activeCount > 0 ? (returning / activeCount) * 100 : 0,
    },
    acquisition: [...acqMap.entries()].map(([source, value]) => ({ source, value })),
    quarterly,
    orderStats: { total: totalOrders, completed, processing, canceled },
    year: {
      currentYear,
      yearRevenue,
      lastYearRevenue,
      avgPerMonth: Math.round(yearRevenue / Math.max(1, new Date().getMonth() + 1)),
      target,
      targetPct: (yearRevenue / target) * 100,
      bestMonth: { label: bestBucket.label, revenue: bestBucket.revenue },
      aov: totalOrders > 0 ? Math.round(allRevenue / totalOrders) : 0,
      returnRate: totalOrders > 0 ? (canceled / totalOrders) * 100 : 0,
      completionRate: totalOrders > 0 ? (completed / totalOrders) * 100 : 0,
    },
  };
}

/** Doanh thu theo ngày của 1 tháng — dùng cho drill-down biểu đồ doanh thu */
export function getDailyRevenue(monthLabel) {
  // monthLabel dạng 'T9/2026'
  const m = /^T(\d{1,2})\/(\d{4})$/.exec(String(monthLabel || '').trim());
  if (!m) return { ok: true, month: monthLabel, daily: [] };
  const month = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  if (month < 1 || month > 12) return { ok: true, month: monthLabel, daily: [] };

  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();
  const daysInMonth = new Date(year, month, 0).getDate();

  const rows = db.prepare(
    'SELECT total, email, timestamp FROM orders WHERE timestamp >= ? AND timestamp < ?'
  ).all(start, end);

  const map = new Map();
  for (let d = 1; d <= daysInMonth; d++) {
    map.set(d, { day: String(d), revenue: 0, orders: 0, customers: new Set() });
  }
  for (const r of rows) {
    const day = new Date(r.timestamp).getDate();
    const cur = map.get(day);
    if (!cur) continue;
    cur.revenue += r.total;
    cur.orders += 1;
    cur.customers.add(r.email);
  }
  return {
    ok: true, // daily: map ở trên
    month: monthLabel,
    daily: [...map.values()].map((d) => ({ day: d.day, revenue: d.revenue, orders: d.orders, customers: d.customers.size })),
  };
}
