import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check, ChevronDown, Copy, Eye, EyeOff, KeyRound, Landmark, Loader2, Package, RefreshCw,
  Search, Shield, ShieldCheck, Trash2, Users as UsersIcon, Webhook, Zap,
} from 'lucide-react';
import { api, errMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { subscribe, isConnected } from '../realtime/client';
import { formatFull, formatTimeFull, formatVND } from '../lib/formatters';
import { VIP_TIERS, tierFromTotal } from '../data/static';
import { MiniCart } from '../components/MiniCart';
import { Avatar } from '../components/vip/Avatar';
import type { AdminPayment, CreditResult, PublicUser, ViewId, WebhookLog } from '../lib/types';

type Tab = 'users' | 'orders' | 'payments';

export function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [realtimeOn, setRealtimeOn] = useState(isConnected());

  useEffect(() => {
    const un = subscribe('connection:state', (p: any) => setRealtimeOn(!!p?.connected));
    return () => un();
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
        <Shield size={36} className="mx-auto text-gray-300" />
        <p className="mt-3 text-sm font-semibold text-gray-500">Chỉ quản trị viên mới truy cập trang này</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={UsersIcon} label="Người dùng" />
          <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')} icon={Package} label="Đơn hàng" />
          <TabBtn active={tab === 'payments'} onClick={() => setTab('payments')} icon={Landmark} label="Cổng thanh toán" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${realtimeOn ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
            <span className={`w-2 h-2 rounded-full ${realtimeOn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            Realtime: {realtimeOn ? 'BẬT' : 'TẮT'}
          </span>
        </div>
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'payments' && <PaymentsTab />}
      <MiniCart />
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        active ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

/* ================= TAB NGƯỜI DÙNG ================= */

interface AdminUser extends PublicUser {
  createdAt?: number;
  googleOnly?: boolean;
}

function UsersTab() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDeb(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ users: AdminUser[]; total: number; pageCount: number; page: number }>(
        `/admin/users?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(qDeb)}&role=${role}&sort=${sort}`,
      );
      setUsers(d.users);
      setTotal(d.total);
      setPageCount(d.pageCount);
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Không tải được danh sách người dùng', message: errMessage(e) });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, qDeb, role, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const u1 = subscribe('users:changed', () => setTimeout(load, 600));
    const u2 = subscribe('analytics:changed', () => setTimeout(load, 600));
    return () => {
      u1();
      u2();
    };
  }, [load]);

  const toggleSel = (email: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const bulk = async (action: 'delete' | 'role', newRole?: 'admin' | 'member') => {
    const emails = [...selected];
    if (!emails.length) return;
    if (action === 'delete' && !window.confirm(`Xóa ${emails.length} tài khoản — cùng toàn bộ đơn hàng, giao dịch và gói nâng cấp của họ?\nTài khoản của bạn (${user?.email}) nếu nằm trong danh sách sẽ được tự động bỏ qua.`)) return;
    try {
      const d = await api<{ deleted?: number; updated?: number }>('/admin/users/bulk', {
        method: 'POST',
        body: { action, emails, role: newRole },
      });
      const n = d.deleted ?? d.updated ?? 0;
      toast.showToast({ type: 'success', title: action === 'delete' ? `Đã xóa ${n} người dùng` : `Đã cập nhật ${n} người dùng` });
      setSelected(new Set());
      load();
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Thao tác thất bại', message: errMessage(e) });
    }
  };

  const removeOne = async (email: string) => {
    if (!window.confirm(`Xóa người dùng ${email}?`)) return;
    try {
      await api(`/admin/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
      toast.showToast({ type: 'success', title: 'Đã xóa người dùng' });
      load();
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Xóa thất bại', message: errMessage(e) });
    }
  };

  const { user } = useAuth();
  const me = user?.email;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quản trị</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý tài khoản, số dư và quyền hạn · {formatVND(total)} người dùng</p>
        <button onClick={load} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600">
          <RefreshCw size={13} /> Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm name / email / userCode..."
            className="pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-400 w-56"
          />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none">
          <option value="">Tất cả vai trò</option>
          <option value="admin">Quản trị viên</option>
          <option value="member">Thành viên</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none">
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="balance">Số dư cao nhất</option>
          <option value="topup">Nhiều đơn nhất</option>
        </select>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/30 animate-fade-in">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Đã chọn {selected.size} người dùng</span>
          <button onClick={() => bulk('delete')} className="px-3.5 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600">Xóa đã chọn</button>
          <button onClick={() => bulk('role', 'admin')} className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200">Đặt làm Quản trị viên</button>
          <button onClick={() => bulk('role', 'member')} className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200">Đặt làm Thành viên</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Bỏ chọn</button>
        </div>
      )}

      {/* Table */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={users.length > 0 && users.every((u) => selected.has(u.email))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(users.map((u) => u.email)) : new Set())}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Tên</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Vai trò</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Số dư</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-center hidden md:table-cell">Đơn</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : users.map((u) => (
                <tr key={u.email} className="border-b border-gray-50 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(u.email)} onChange={() => toggleSel(u.email)} aria-label={`Chọn ${u.email}`} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{u.email}{me === u.email && <span className="ml-1.5 text-[9px] font-bold text-blue-500">(bạn)</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} avatar={u.avatar} size="sm" vip={u.vip} />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'bg-gray-500/10 text-gray-500'}`}>
                      {u.role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'THÀNH VIÊN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatVND(u.balance)}đ</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 hidden md:table-cell">{formatVND(u.userCode)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditUser(u)} aria-label={`Chỉnh sửa ${u.email}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <button onClick={() => removeOne(u.email)} disabled={me === u.email} aria-label={`Xóa ${u.email}`} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-gray-400">
          Hiển thị {users.length ? (page - 1) * pageSize + 1 : 0}–{(page - 1) * pageSize + users.length} trên {formatVND(total)} người dùng · trang {page}/{pageCount}
        </p>
        <div className="flex items-center gap-2">
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs outline-none">
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold disabled:opacity-40">Trước</button>
          <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold disabled:opacity-40">Sau</button>
        </div>
      </div>

      {editUser && <UserEditModal user={editUser} onClose={() => setEditUser(null)} onSaved={load} />}
    </div>
  );
}

/* ===== User edit modal ===== */

function UserEditModal({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [balanceAction, setBalanceAction] = useState<'add' | 'sub'>('add');
  const [amountStr, setAmountStr] = useState('');
  const [vipOverride, setVipOverride] = useState<string>(user.vipOverride === null ? '' : String(user.vipOverride));
  const [busy, setBusy] = useState(false);

  const amount = parseInt(amountStr.replace(/\D/g, '') || '0', 10);
  const previewTotal = balanceAction === 'add' ? user.totalTopup + amount : user.totalTopup;
  const previewTier = tierFromTotal(previewTotal);
  const subExceed = balanceAction === 'sub' && amount > user.balance;

  const save = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      if (name.trim() && name !== user.name) body.name = name.trim();
      if (role !== user.role) body.role = role;
      if (amount > 0 && !subExceed) {
        body.balanceAction = balanceAction;
        body.amount = amount;
      }
      if (vipOverride !== (user.vipOverride === null ? '' : String(user.vipOverride))) {
        body.vipOverride = vipOverride === '' ? null : Number(vipOverride);
      }
      await api(`/admin/users/${encodeURIComponent(user.email)}`, { method: 'PUT', body });
      toast.showToast({ type: 'success', title: 'Cập nhật thành công', message: amount > 0 ? (balanceAction === 'add' ? `Đã cộng ${formatVND(amount)}đ vào số dư` : `Đã trừ ${formatVND(amount)}đ khỏi số dư`) : undefined });
      onSaved();
      onClose();
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Cập nhật thất bại', message: errMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
      <div className="max-w-md w-full max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-pop-in" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chỉnh sửa người dùng</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên hiển thị</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <input value={user.email} readOnly className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-400 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vai trò</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none">
              <option value="member">Thành viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>

          {/* Balance */}
          <div className="p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Số dư hiện tại</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatVND(user.balance)}đ</span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Kiểu điều chỉnh</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setBalanceAction('add')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${balanceAction === 'add' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                >
                  ＋ Cộng tiền
                </button>
                <button
                  onClick={() => setBalanceAction('sub')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${balanceAction === 'sub' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                >
                  － Trừ tiền
                </button>
              </div>
            </div>
            <input
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              inputMode="numeric"
              placeholder="Nhập số tiền để áp dụng"
              className={`mt-2.5 w-full px-4 py-2.5 bg-white dark:bg-gray-700/60 border rounded-xl text-sm outline-none ${subExceed ? 'border-rose-400' : 'border-gray-200 dark:border-gray-600 focus:border-blue-400'}`}
            />
            {subExceed && <p className="mt-1 text-xs text-rose-500">Số trừ ({formatVND(amount)}đ) vượt số dư hiện tại</p>}
            <p className="mt-1.5 text-[10px] text-gray-400">
              {balanceAction === 'add' ? 'Cộng dồn vào số dư và tính vào tổng nạp VIP — không thay thế giá trị cũ' : 'Chỉ trừ khỏi số dư hiện tại — tổng nạp VIP không đổi'}
            </p>
          </div>

          {/* VIP override */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tổng nạp VIP</label>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatVND(user.totalTopup)}đ</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {previewTier ? `Lên VIP ${previewTier.level} · ${previewTier.name}` : '· chưa đạt hạng'} — tự động theo tổng nạp
            </p>
            <select value={vipOverride} onChange={(e) => setVipOverride(e.target.value)} className="mt-2 w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none">
              <option value="">chưa có hạng (tự động)</option>
              <option value="0">không có VIP</option>
              {VIP_TIERS.map((t) => (
                <option key={t.level} value={String(t.level)}>VIP {t.level} (đặt cứng)</option>
              ))}
            </select>
            <p className="mt-1.5 text-[10px] text-gray-400 leading-relaxed">
              {vipOverride === '' ? 'Hạng tự động tăng theo tổng tiền đã nạp của tài khoản này.' : vipOverride === '0' ? 'Tài khoản sẽ hiển thị không có hạng VIP dù tổng nạp đã đạt ngưỡng.' : 'Đặt cứng hạng này — không tự tăng theo tổng nạp, thưởng nạp áp dụng ngay theo hạng đã chọn.'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold">Đóng</button>
          <button onClick={save} disabled={busy || subExceed} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : null} Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= TAB ĐƠN HÀNG ================= */

interface AdminOrder {
  id: string;
  email: string;
  customer: string;
  items: any[];
  total: number;
  status: string;
  timestamp: number;
  date: number;
}

function OrdersTab() {
  const toast = useToast();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('Đang xử lý');
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQDeb(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async (silent = false) => {
    try {
      const d = await api<{ orders: AdminOrder[]; total: number }>(`/admin/orders?page=${page}&pageSize=10&status=${encodeURIComponent(status)}&q=${encodeURIComponent(qDeb)}`);
      setOrders(d.orders);
      setTotal(d.total);
    } catch (e) {
      if (!silent) toast.showToast({ type: 'error', title: 'Không thể tải danh sách đơn hàng', message: errMessage(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, qDeb]);

  useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  useEffect(() => {
    const u1 = subscribe('order:created', () => setTimeout(() => load(true), 400));
    const u2 = subscribe('analytics:changed', () => setTimeout(() => load(true), 400));
    return () => {
      u1();
      u2();
    };
  }, [load]);

  const setStatusFor = async (id: string, newStatus: string) => {
    try {
      await api(`/admin/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: newStatus } });
      toast.showToast({
        type: 'success',
        title: newStatus === 'Hoàn thành' ? `Đơn ${id} đã hoàn thành` : newStatus === 'Đã hủy' ? `Đơn ${id} đã hủy` : `Đơn ${id} mở lại`,
        message: newStatus === 'Hoàn thành' ? 'Đã ghi nhận gửi đầy đủ thông tin cho khách.' : undefined,
      });
      load(true);
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Cập nhật trạng thái thất bại', message: errMessage(e) });
    }
  };

  const pendingCount = orders?.filter((o) => o.status === 'Đang xử lý').length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Chuyển dữ liệu đơn hàng cho khách · {formatVND(total)} đơn</p>
        <button onClick={() => load()} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold">
          <RefreshCw size={13} /> Làm mới
        </button>
      </div>

      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-start gap-2.5">
        <span className="text-sm">ℹ️</span>
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          Đơn <b>Đang xử lý</b> = shop chưa gửi thông tin tài khoản cho khách. Sau khi gửi đầy đủ dữ liệu, bấm <b>Đã gửi thông tin</b> để hoàn tất đơn.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['Đang xử lý', 'Hoàn thành', 'Đã hủy', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              status === s ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s || 'Tất cả'}
          </button>
        ))}
        {status === 'Đang xử lý' && pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Hàng đợi gửi dữ liệu: {pendingCount}
          </span>
        )}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã đơn / khách..." className="pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-400 w-52" />
        </div>
      </div>

      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Mã ĐH</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Khách hàng</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Sản phẩm</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Ngày đặt</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {orders === null ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Không có đơn nào{status ? ` ở trạng thái "${status}"` : ''}</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{o.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{o.customer || '—'}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{o.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate hidden md:table-cell">
                      {(Array.isArray(o.items) ? o.items : []).map((i: any) => `${i.name} ×${i.quantity}`).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{formatVND(o.total)}đ</td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">{formatFull(o.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_PILL_ADMIN[o.status] || 'bg-gray-100 text-gray-500'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {o.status === 'Đang xử lý' ? (
                        <button
                          onClick={() => setStatusFor(o.id, 'Hoàn thành')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                        >
                          Đã gửi thông tin
                        </button>
                      ) : (
                        <div className="flex gap-1.5">
                          {o.status === 'Hoàn thành' && (
                            <button onClick={() => setStatusFor(o.id, 'Đã hủy')} title="Hủy đơn hàng" className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/20">Hủy</button>
                          )}
                          {o.status === 'Đã hủy' && (
                            <button onClick={() => setStatusFor(o.id, 'Đang xử lý')} title="Mở lại — đơn chưa hoàn tất gửi dữ liệu" className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20">Mở lại</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold disabled:opacity-40">Trước</button>
        <span className="text-xs text-gray-400">Trang {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={!!orders && orders.length < 10} className="px-3.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold disabled:opacity-40">Sau</button>
      </div>
    </div>
  );
}

const STATUS_PILL_ADMIN: Record<string, string> = {
  'Hoàn thành': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Đang xử lý': 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Đã hủy': 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
};

/* ================= TAB CỔNG THANH TOÁN ================= */

function PaymentsTab() {
  const toast = useToast();
  const [config, setConfig] = useState<any>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [simulating, setSimulating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, l] = await Promise.all([
        api<any>('/admin/payments/config'),
        api<{ payments: AdminPayment[] }>('/admin/payments?limit=25'),
        api<{ logs: WebhookLog[] }>('/admin/payments/logs?limit=50'),
      ]);
      setConfig(c);
      setPayments(p.payments || []);
      setLogs(l.logs || []);
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Đang tải cấu hình cổng thanh toán…', message: errMessage(e) });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rotateSecret = async () => {
    if (!window.confirm('Xoay webhook secret? Secret cũ sẽ vô hiệu ngay — cổng CK phải đổi api_key.')) return;
    try {
      const d = await api<{ secret: string }>('/admin/payments/config/secret', { method: 'POST', body: {} });
      setConfig((c: any) => ({ ...c, secret: d.secret }));
      toast.showToast({ type: 'success', title: 'Đã xoay secret ngẫu nhiên' });
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Xoay secret thất bại', message: errMessage(e) });
    }
  };

  const setApiKeyAsSecret = async () => {
    if (!apiKey.trim()) return;
    try {
      await api('/admin/payments/config/secret', { method: 'POST', body: { secret: apiKey.trim() } });
      setConfig((c: any) => ({ ...c, secret: apiKey.trim() }));
      setApiKey('');
      toast.showToast({ type: 'success', title: 'Đã đặt API key làm secret' });
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Đặt secret thất bại', message: errMessage(e) });
    }
  };

  const simulate = async (id: string) => {
    setSimulating(id);
    try {
      await api(`/payments/${encodeURIComponent(id)}/simulate`, { method: 'POST' });
      toast.showToast({ type: 'success', title: 'Đã mô phỏng chuyển khoản thành công' });
      load();
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Mô phỏng thất bại', message: errMessage(e) });
    } finally {
      setSimulating(null);
    }
  };

  if (loading && !config) {
    return (
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center text-sm text-gray-400">
        Đang tải cấu hình cổng thanh toán…
      </div>
    );
  }

  const webhookUrl = `${location.origin}/api/payments/webhook`;
  const bank = config?.bank || {};

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">VietQR động · webhook đối soát tự động · {formatVND(payments.length)} giao dịch</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Webhook card */}
        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Webhook size={16} className="text-blue-500" /> Webhook nhận tiền (bảo mật bắt buộc)
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={11} /> Đang bảo vệ
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">HMAC-SHA256 hoặc secret · rate-limit 30 req/phút/IP · audit toàn bộ request · idempotent</p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">URL webhook (dán vào Casso / SePay)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{webhookUrl}</code>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(webhookUrl);
                      toast.showToast({ type: 'success', title: 'Đã sao chép URL webhook' });
                    } catch {}
                  }}
                  aria-label="Sao chép URL webhook"
                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Webhook secret</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                  {showSecret ? config?.secret || '—' : '•'.repeat(32)}
                </code>
                <button onClick={() => setShowSecret((s) => !s)} aria-label={showSecret ? 'Ẩn secret' : 'Hiện secret'} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500">
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(config?.secret || '');
                      toast.showToast({ type: 'success', title: 'Đã sao chép secret' });
                    } catch {}
                  }}
                  aria-label="Sao chép secret"
                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                >
                  <Copy size={14} />
                </button>
                <button onClick={rotateSecret} className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
                  <KeyRound size={13} /> Xoay
                </button>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">Cách xác thực (1 trong 2): header x-casso-signature = HMAC-SHA256 hex của body · hoặc query ?api_key=… (SePay)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">API key cổng thanh toán</p>
              <div className="flex gap-2">
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="VD: c2e11d97-a1b2-… (API key Casso) hoặc key SePay"
                  className="flex-1 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-xs outline-none focus:border-blue-400"
                />
                <button onClick={setApiKeyAsSecret} className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold whitespace-nowrap">Đặt làm secret</button>
              </div>
            </div>
          </div>
        </div>

        {/* Bank account card */}
        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Landmark size={16} className="text-blue-500" /> Tài khoản nhận tiền
          </h3>
          <div className="mt-4 space-y-2.5">
            <InfoRowStatic label="Ngân hàng" value={`${bank.name || 'Vietcombank'} (${bank.short || 'VCB'})`} />
            <InfoRowStatic label="Số tài khoản" value={bank.accountNo || bank.accountNumber || '1071100102'} copy />
            <InfoRowStatic label="Chủ tài khoản" value={bank.accountName || 'LUONG VAN KUN'} />
          </div>
          <div className="mt-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-start gap-2.5">
            <Zap size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">QR VietQR chuẩn Napas — app ngân hàng quét tự điền STK + tiền + nội dung</p>
          </div>
        </div>
      </div>

      {/* Hướng dẫn Casso/SePay */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GuideCard
          title="Nối Casso (tự động nhất)"
          steps={[
            'Đăng ký casso.vn → Kết nối tài khoản Vietcombank',
            'Mục Tích hợp → API → tạo API key',
            'Dán API key vào ô "Dán API key Casso" bên trên → Đặt làm secret',
            'Mục Webhook → thêm URL webhook bên trên, sự kiện "Khi có giao dịch nhận tiền"',
            'Chuyển thử 10.000đ với nội dung NAPxxxxxx — tiền tự cộng!',
          ]}
        />
        <GuideCard
          title="Nối SePay"
          steps={[
            'Đăng ký sepay.vn → thêm tài khoản ngân hàng VCB',
            'Mục Tài khoản ngân hàng → Webhook → tạo mới',
            'Dán URL webhook bên trên · Kiểu dữ liệu: "Tất cả" · Khi nhận tiền',
            'API key của SePay dán vào ô secret bên trên (gửi kèm ?api_key=…)',
            'Webhook URL test có sẵn — bấm thử để kiểm tra kết nối',
          ]}
        />
      </div>

      {/* Payments table */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Giao dịch VietQR (25 giao dịch gần nhất)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Mã CK</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Khách</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Số tiền</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Thời gian</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{p.content}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono hidden sm:table-cell">{p.email}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{formatVND(p.amount)}đ</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{formatTimeFull(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    {p.status === 'pending' ? (
                      <button
                        onClick={() => simulate(p.id)}
                        disabled={simulating === p.id}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                      >
                        {simulating === p.id ? 'Đang mô phỏng...' : 'Mô phỏng'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Chưa có giao dịch nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook logs */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Log webhook (audit bảo mật) — 50 request gần nhất — cả bị chặn lẫn thành công</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-gray-800">
              <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Thời gian</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">IP</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Nguồn</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Kết quả</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700/40">
                  <td className="px-4 py-2.5 text-xs text-gray-400">{formatTimeFull(l.ts)}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{l.ip}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{l.provider}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                      {l.ok ? 'OK' : ' Chặn'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[240px] truncate">{l.reason}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Chưa có log webhook</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"> Đã nhận</span>;
  if (status === 'expired') return <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-500/10 text-gray-400"> Hết hạn</span>;
  return <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"> Chờ CK</span>;
}

function InfoRowStatic({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const toast = useToast();
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate font-mono">{value}</span>
        {copy && (
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                toast.showToast({ type: 'success', title: 'Đã sao chép số tài khoản' });
              } catch {}
            }}
            aria-label="Sao chép"
            className="text-gray-400 hover:text-blue-600"
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function GuideCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h4>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
