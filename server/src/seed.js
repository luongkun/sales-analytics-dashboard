// Seed dữ liệu lịch sử demo cho analytics.
// Chạy: node src/seed.js         (idempotent — bỏ qua nếu đã seed)
//       node src/seed.js --force  (xóa đơn seed cũ + sinh lại)
//
// Sinh:
//  - ~170 khách hàng demo (tên Việt, region, nguồn, createdAt trải 24 tháng,
//    mật độ tăng dần để đường "khách hàng" tăng trưởng)
//  - ~8.500 đơn hàng trải 24 tháng kết thúc ở THÁNG HIỆN TẠI (chỉ đến hôm nay),
//    số đơn tăng ~5.5%/tháng → biểu đồ doanh thu có xu hướng tăng
//  - Trạng thái đơn hợp lý: đơn cũ đa số "Hoàn thành", đơn 3 ngày gần nhất
//    nghiêng về "Đang xử lý" (shop không hỗ trợ giao hàng)
//  - Vài giao dịch nạp tiền demo cho mỗi khách
//
// Đơn seed dùng id 5 chữ số (ORD-15001…): KHÔNG bao giờ đụng id thật
// (đơn thật dạng ORD-XXXXXX — 6 chữ số từ Date.now).

import bcrypt from 'bcryptjs';
import db from './db.js';
import { PRODUCTS, REGIONS, SOURCES } from './catalog.js';

const force = process.argv.includes('--force');
const SEED_TAG = 'seeded-v1';

// ---------- Meta ----------
db.exec('CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT)');

const alreadySeeded = db.prepare('SELECT value FROM seed_meta WHERE key = ?').get(SEED_TAG);

// ---------- Sinh tên & email Việt ----------
const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE = ['Văn', 'Thị', 'Hữu', 'Quang', 'Minh', 'Thanh', 'Thu', 'Ngọc', 'Phương', 'Hoàng', 'Đức', 'Gia'];
const GIVEN_M = ['An', 'Bình', 'Cường', 'Duy', 'Phong', 'Hải', 'Khoa', 'Long', 'Nam', 'Phúc', 'Quân', 'Sang', 'Thắng', 'Tuấn', 'Việt', 'Đạt', 'Dũng', 'Hưng', 'Khang', 'Sơn'];
const GIVEN_F = ['Anh', 'Chi', 'Duyên', 'Giang', 'Hà', 'Hạnh', 'Hồng', 'Huệ', 'Hương', 'Khanh', 'Lan', 'Linh', 'Mai', 'My', 'Nga', 'Nhi', 'Oanh', 'Sương', 'Trâm', 'Vy', 'Yến'];

// Bỏ dấu tiếng Việt
const deaccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeighted(items) {
  const total = items.reduce((s, p) => s + (p.weight !== undefined ? p.weight : p.w), 0);
  let r = Math.random() * total;
  for (const p of items) {
    r -= p.weight !== undefined ? p.weight : p.w;
    if (r <= 0) return p;
  }
  return items[items.length - 1];
}

// ---------- 1. Khách hàng demo ----------
function seedUsers() {
  const existing = db.prepare("SELECT COUNT(*) AS c FROM users WHERE email LIKE '%@demo.luongkun.io'").get().c;
  if (existing > 0 && !force) {
    console.log(`[seed] Bỏ qua ${existing} khách demo đã có`);
    return db.prepare("SELECT email, createdAt FROM users WHERE email LIKE '%@demo.luongkun.io'").all();
  }
  if (force) {
    // xóa dữ liệu con TRƯỚC để không vi phạm khóa ngoại
    db.prepare("DELETE FROM orders WHERE email LIKE '%@demo.luongkun.io'").run();
    db.prepare("DELETE FROM purchases WHERE email LIKE '%@demo.luongkun.io'").run();
    db.prepare("DELETE FROM transactions WHERE email LIKE '%@demo.luongkun.io'").run();
    db.prepare("DELETE FROM users WHERE email LIKE '%@demo.luongkun.io'").run();
  }

  const now = new Date();
  const rows = [];
  const usedEmails = new Set();
  const usedNames = new Set();

  // mật độ tăng dần: tháng càng gần càng nhiều khách mới
  for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
    const count = 2 + Math.round((23 - monthsAgo) * 0.45); // 2 → ~12/tháng
    for (let k = 0; k < count; k++) {
      // sinh tên duy nhất
      let name = '';
      for (let tries = 0; tries < 30; tries++) {
        const family = pick(FAMILY);
        const given = Math.random() < 0.5 ? pick(GIVEN_M) : pick(GIVEN_F);
        const useMiddle = Math.random() < 0.85;
        const middle = useMiddle
          ? (given.endsWith('ị') || ['An', 'Anh', 'Bình', 'Cường', 'Duy', 'Phong', 'Hải', 'Khoa', 'Long', 'Nam', 'Phúc', 'Quân', 'Sang', 'Thắng', 'Tuấn', 'Việt', 'Đạt', 'Dũng', 'Hưng', 'Khang', 'Sơn'].includes(given) ? pick(['Văn', 'Hữu', 'Quang', 'Minh', 'Thanh', 'Hoàng', 'Đức', 'Gia']) : pick(MIDDLE))
          : null;
        name = middle ? `${family} ${middle} ${given}` : `${family} ${given}`;
        if (!usedNames.has(name)) break;
      }
      usedNames.add(name);

      let slug = deaccent(name).toLowerCase().replace(/[^a-z0-9]/g, '');
      let email = `${slug}@demo.luongkun.io`;
      let n = 1;
      while (usedEmails.has(email) || db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
        email = `${slug}${n}@demo.luongkun.io`;
        n++;
      }
      usedEmails.add(email);

      // createdAt ngẫu nhiên trong tháng đó
      const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1 + Math.floor(Math.random() * 27), 9, 18);
      const createdAt = Math.min(d.getTime(), Date.now());

      // region / source theo trọng số thật
      const region = pickWeighted([
        { w: 4, v: 'Miền Nam' }, { w: 3.5, v: 'Miền Bắc' }, { w: 2.5, v: 'Miền Trung' },
      ]).v;
      const source = pickWeighted([
        { w: 4, v: 'Website' }, { w: 3, v: 'Mobile App' }, { w: 2, v: 'Social Media' }, { w: 1, v: 'Giới thiệu' },
      ]).v;

      // cân ví: khách cũ nhiều dư hơn
      const balance = Math.round((50000 + Math.random() * 400000) + (23 - monthsAgo) * 30000 * Math.random());

      rows.push({ email, name, region, source, balance, createdAt });
    }
  }
  rows.sort((a, b) => a.createdAt - b.createdAt);

  // tất cả demo user dùng chung 1 hash của mật khẩu '123456'
  const hash = bcrypt.hashSync('123456', 10);
  const insert = db.prepare(
    'INSERT INTO users (email, name, password, role, balance, region, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const r of rows) {
      insert.run(r.email, r.name, hash, 'member', r.balance, r.region, r.source, r.createdAt);
    }
  });
  tx();
  console.log(`[seed] Đã tạo ${rows.length} khách hàng demo`);

  // vài giao dịch nạp demo
  const insTx = db.prepare(
    'INSERT OR IGNORE INTO transactions (id, email, type, amount, bonus, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const tx2 = db.transaction(() => {
    for (const r of rows) {
      const n = Math.floor(Math.random() * 3); // 0-2 lượt nạp
      for (let i = 0; i < n; i++) {
        const amount = [100000, 200000, 500000, 1000000][Math.floor(Math.random() * 4)];
        const bonus = amount >= 1000000 ? Math.round(amount * 0.05) : amount >= 500000 ? Math.round(amount * 0.02) : 0;
        const t = r.createdAt + Math.floor(Math.random() * 90) * 86400000;
        if (t > Date.now()) continue;
        insTx.run(`TXS-${deaccent(r.email).slice(0, 10)}-${i}`, r.email, 'topup', amount, bonus, t);
      }
    }
  });
  tx2();
  return rows;
}

// ---------- 2. Đơn hàng ----------
function seedOrders() {
  const existingOrders = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  if (existingOrders > 200 && !force) {
    console.log(`[seed] Bỏ qua seed đơn — đã có ${existingOrders} đơn`);
    return existingOrders;
  }
  if (force) {
    db.prepare('DELETE FROM orders WHERE id LIKE ?').run('ORD-S%');
  }

  const users = db.prepare(
    "SELECT email, createdAt FROM users WHERE role = 'member' ORDER BY createdAt"
  ).all();
  if (users.length === 0) throw new Error('Cần seed users trước');

  // trọng số mua: khách lâu năm + ngẫu nhiên cá nhân → vài "khách VIP" nổi bật
  const now = Date.now();
  const buyers = users.map((u) => {
    const months = Math.max(1, (now - u.createdAt) / (30.4 * 86400000));
    return { email: u.email, w: 0.4 + (months / 24) * 1.6 + Math.random() * 1.6 };
  });

  const pad2 = (n) => String(n).padStart(2, '0');
  const today = new Date();
  const startSeq = 15001;
  let seq = startSeq;
  let totalOrders = 0;
  let totalRevenue = 0;

  const insert = db.prepare(
    'INSERT INTO orders (id, email, items, total, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
      const base = 180;
      const growth = Math.pow(1.055, 23 - monthsAgo);
      let count = Math.round(base * growth);

      const monthStart = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - monthsAgo + 1, 1);
      // tháng hiện tại: chỉ sinh đến hôm nay
      const lastDay = Math.min(monthEnd.getTime(), Date.now() + 1);
      if (monthsAgo === 0) {
        const frac = (lastDay - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime());
        count = Math.max(5, Math.round(count * frac));
      }

      for (let i = 0; i < count; i++) {
        // người mua theo trọng số
        let r = Math.random() * buyers.reduce((s, b) => s + b.w, 0);
        let buyer = buyers[buyers.length - 1];
        for (const b of buyers) {
          r -= b.w;
          if (r <= 0) { buyer = b; break; }
        }
        // thời điểm ngẫu nhiên trong tháng
        const ts = monthStart.getTime() + Math.random() * (lastDay - monthStart.getTime());
        const daysAgo = (Date.now() - ts) / 86400000;

        // sản phẩm: 1-2 món
        const itemCount = Math.random() < 0.8 ? 1 : 2;
        const items = [];
        let total = 0;
        for (let k = 0; k < itemCount; k++) {
          const p = pickWeighted(PRODUCTS);
          let qty = 1;
          if (p.price <= 300000) qty = Math.random() < 0.5 ? 2 : 1; // đồ rẻ mua 2
          items.push({ productId: p.id, name: p.name, price: p.price, quantity: qty });
          total += p.price * qty;
        }

        // trạng thái theo độ tuổi đơn (shop không hỗ trợ giao hàng — không có 'Đang giao')
        let status;
        if (daysAgo < 1) status = pickWeighted([{ w: 60, v: 'Đang xử lý' }, { w: 30, v: 'Hoàn thành' }, { w: 10, v: 'Đã hủy' }]).v;
        else if (daysAgo < 3) status = pickWeighted([{ w: 35, v: 'Đang xử lý' }, { w: 55, v: 'Hoàn thành' }, { w: 10, v: 'Đã hủy' }]).v;
        else status = pickWeighted([{ w: 90, v: 'Hoàn thành' }, { w: 10, v: 'Đã hủy' }]).v;

        insert.run(`ORD-S${seq}`, buyer.email, JSON.stringify(items), total, status, Math.floor(ts));
        seq++;
        totalOrders++;
        totalRevenue += total;
      }
    }
  });
  tx();

  db.prepare('INSERT OR REPLACE INTO seed_meta (key, value) VALUES (?, ?)').run(SEED_TAG, new Date().toISOString());
  console.log(`[seed] Đã sinh ${totalOrders} đơn hàng, tổng doanh thu ${(totalRevenue / 1e9).toFixed(1)} tỷ`);
  return totalOrders;
}

const u = seedUsers();
const o = seedOrders();
console.log(`[seed] Hoàn tất: ${u.length} khách demo, ${o} đơn trong DB`);
