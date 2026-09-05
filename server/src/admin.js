// Truy vấn quản trị: phân trang + tìm kiếm + sắp xếp phía server, và hành động hàng loạt.

import db from './db.js';

const SORTS = {
  newest: 'u.createdAt DESC',
  oldest: 'u.createdAt ASC',
  balance: 'u.balance DESC',
  orders: '(SELECT COUNT(*) FROM orders o WHERE o.email = u.email) DESC',
  email: 'u.email ASC',
};

const PAGE_SIZES = [10, 20, 50];

/** escape ký tự LIKE để tìm kiếm an toàn */
function likeEscape(q) {
  return String(q || '').replace(/[\\%_]/g, (c) => '\\' + c);
}

/**
 * Lấy 1 trang danh sách người dùng kèm thống kê.
 * @param {{page?: number, pageSize?: number, q?: string, role?: string, sort?: string}} params
 */
export function getAdminUsersPage({ page = 1, pageSize = 10, q = '', role = 'all', sort = 'newest' } = {}) {
  const size = PAGE_SIZES.includes(Number(pageSize)) ? Number(pageSize) : 10;
  const where = [];
  const args = [];

  if (q && String(q).trim()) {
    const pat = `%${likeEscape(String(q).trim())}%`;
    where.push("(u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR IFNULL(u.region,'') LIKE ? ESCAPE '\\')");
    args.push(pat, pat, pat);
  }
  if (role === 'admin' || role === 'member') {
    where.push('u.role = ?');
    args.push(role);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORTS[sort] || SORTS.newest;

  const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${whereSql}`).get(...args).c;
  const pageCount = Math.max(1, Math.ceil(total / size));

  let p = Math.max(1, Math.floor(Number(page) || 1));
  if (p > pageCount) p = pageCount; // clamp khi tổng số trang co lại

  const users = db.prepare(
    `SELECT u.email, u.name, u.role, u.balance, u.avatar, u.googleOnly, u.createdAt,
            (SELECT COUNT(*) FROM purchases p WHERE p.email = u.email) AS purchases,
            (SELECT COUNT(*) FROM orders o WHERE o.email = u.email) AS orderCount,
            (SELECT COUNT(*) FROM transactions t WHERE t.email = u.email) AS transactions,
            (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.email = u.email AND t.type IN ('topup','admin_topup')) AS totalTopup,
            u.region, u.vipOverride
     FROM users u ${whereSql}
     ORDER BY ${orderBy}, u.email ASC
     LIMIT ? OFFSET ?`
  ).all(...args, size, (p - 1) * size).map((u) => ({
    email: u.email,
    name: u.name,
    role: u.role,
    balance: u.balance,
    avatar: u.avatar || null,
    googleOnly: u.googleOnly === 1,
    createdAt: u.createdAt,
    region: u.region || null,
    purchases: u.purchases,
    orderCount: u.orderCount,
    transactions: u.transactions,
    totalTopup: u.totalTopup,
    vipOverride: u.vipOverride ?? null,
  }));

  return { users, total, page: p, pageSize: size, pageCount };
}

// Lấy toàn bộ (không phân trang) — dùng nội bộ khi cần
export function getAllUsersWithData() {
  const { users } = getAdminUsersPage({ page: 1, pageSize: 50, sort: 'newest' });
  return users;
}

const PROTECTED = 'admin@luongkun.io';

/** Xóa hàng loạt (transaction). Trả về { deleted, skipped } */
export function bulkDeleteUsers(emails, actor) {
  const list = [...new Set((emails || []).map((e) => String(e).trim().toLowerCase()))].filter(Boolean);
  const deleted = [];
  const skipped = [];
  const del = db.transaction((batch) => {
    for (const email of batch) {
      const user = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
      if (!user) { skipped.push({ email, reason: 'Không tồn tại' }); continue; }
      if (email === PROTECTED) { skipped.push({ email, reason: 'Tài khoản admin chính được bảo vệ' }); continue; }
      db.prepare('DELETE FROM purchases WHERE email = ?').run(email);
      db.prepare('DELETE FROM orders WHERE email = ?').run(email);
      db.prepare('DELETE FROM transactions WHERE email = ?').run(email);
      db.prepare('DELETE FROM users WHERE email = ?').run(email);
      deleted.push(email);
    }
  });
  del(list);
  return { deleted, skipped, actor };
}

/** Đổi vai trò hàng loạt. Trả về { updated, skipped } */
export function bulkSetRole(emails, role, actor) {
  if (role !== 'admin' && role !== 'member') throw new Error('Vai trò không hợp lệ');
  const list = [...new Set((emails || []).map((e) => String(e).trim().toLowerCase()))].filter(Boolean);
  const updated = [];
  const skipped = [];
  const upd = db.transaction((batch) => {
    for (const email of batch) {
      const user = db.prepare('SELECT email, role FROM users WHERE email = ?').get(email);
      if (!user) { skipped.push({ email, reason: 'Không tồn tại' }); continue; }
      if (email === PROTECTED && role !== 'admin') {
        skipped.push({ email, reason: 'Không thể hạ cấp admin chính' });
        continue;
      }
      if (user.role === role) { skipped.push({ email, reason: `Đã là ${role === 'admin' ? 'quản trị viên' : 'thành viên'}` }); continue; }
      db.prepare('UPDATE users SET role = ? WHERE email = ?').run(role, email);
      updated.push(email);
    }
  });
  upd(list);
  return { updated, skipped, actor };
}
