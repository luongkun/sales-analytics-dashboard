import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  Edit,
  Trash2,
  Shield,
  X,
  RefreshCw,
  Search,
  Package,
  Wifi,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Wallet,
  Plus,
  Minus,
  Crown,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNumber } from '../data/salesData';
import { getVipInfo } from '../utils/vip';
import AnimatedSection from '../components/AnimatedSection';
import { onRealtime, type UsersChangedPayload } from '../realtime/client';

interface UserData {
  email: string;
  name: string;
  role: string;
  balance: number;
  avatar: string | null;
  googleOnly: boolean;
  createdAt: number;
  region: string | null;
  purchases: number;
  orderCount: number;
  transactions: number;
  /** tổng tiền đã nạp (nạp thật + admin cộng tay) — quyết định hạng VIP */
  totalTopup: number;
}

interface UsersPageResponse {
  ok: boolean;
  users: UserData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface BulkResult {
  ok: boolean;
  affected: number;
  deleted?: string[];
  updated?: string[];
  skipped?: { email: string; reason: string }[];
}

const PROTECTED_EMAIL = 'admin@luongkun.io';
const PAGE_SIZES = [10, 20, 50];
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'balance', label: 'Số dư cao nhất' },
  { value: 'orders', label: 'Nhiều đơn nhất' },
  { value: 'email', label: 'Email A-Z' },
];

/** Các số trang hiển thị: 1 … p-1 p p+1 … last */
function pageList(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);
  if (from > 2) out.push('…');
  for (let p = from; p <= to; p++) out.push(p);
  if (to < pageCount - 1) out.push('…');
  out.push(pageCount);
  return out;
}

export default function AdminPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  // --- trạng thái danh sách (server-side) ---
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  // --- chọn hàng loạt ---
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // --- chỉnh sửa 1 user ---
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);

  // --- điều chỉnh số dư (cộng/trừ dần, không set tuyệt đối) ---
  const [adjustMode, setAdjustMode] = useState<'add' | 'sub'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const adjustValue = parseInt(adjustAmount, 10) || 0;
  const adjustValid = adjustValue > 0 && (adjustMode === 'add' || adjustValue <= (editingUser?.balance ?? 0));
  const previewBalance = editingUser ? Math.max(0, editingUser.balance + (adjustMode === 'add' ? adjustValue : -adjustValue)) : 0;

  // Xem trước ảnh hưởng VIP: cộng tiền tính vào tổng nạp, trừ tiền không đổi
  const vipNow = editingUser ? getVipInfo(editingUser.totalTopup) : null;
  const vipAfter = editingUser
    ? getVipInfo(adjustMode === 'add' && adjustValue > 0 ? editingUser.totalTopup + adjustValue : editingUser.totalTopup)
    : null;
  const vipUpPreview =
    adjustMode === 'add' && adjustValue > 0 && adjustValid && vipNow && vipAfter
      ? (vipAfter.tier?.level ?? 0) > (vipNow.tier?.level ?? 0)
        ? vipAfter.tier
        : null
      : null;

  const ADJUST_PRESETS = [50_000, 100_000, 500_000, 1_000_000];

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = user?.role === 'admin';

  // debounce ô tìm kiếm
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1); // tìm mới → về trang 1
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedSearch,
        role: roleFilter,
        sort,
      });
      const res = await api<UsersPageResponse>(`/admin/users?${params.toString()}`);
      setUsers(res.users);
      setTotal(res.total);
      setPageCount(res.pageCount);
      setPage(res.page); // server có thể clamp
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Không thể tải danh sách người dùng', message: msg });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, roleFilter, sort]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [fetchUsers, isAdmin]);

  // realtime: bảng tự làm mới (giữ nguyên trang đang xem)
  const fetchRef = useRef(fetchUsers);
  fetchRef.current = fetchUsers;
  useEffect(() => {
    if (!live || !isAdmin) return;
    const off = onRealtime<UsersChangedPayload>('users:changed', (p) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        fetchRef.current();
        if (p.type === 'created' && p.email) {
          showToast({ type: 'info', title: 'Người dùng mới', message: `${p.email} vừa đăng ký tài khoản.` });
        }
      }, 400);
    });
    return () => {
      off();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [live, isAdmin]);

  // ---------- chọn / bỏ chọn ----------
  const selectableUsers = users.filter((u) => u.email !== PROTECTED_EMAIL);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selected.has(u.email));
  const someSelected = selectableUsers.some((u) => selected.has(u.email)) && !allSelected;

  const toggleSelect = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        selectableUsers.forEach((u) => next.delete(u.email));
        return next;
      }
      const next = new Set(prev);
      selectableUsers.forEach((u) => next.add(u.email));
      return next;
    });
  };
  // bỏ chọn những email không còn trên trang hiện tại
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const pageEmails = new Set(users.map((u) => u.email));
      const next = new Set([...prev].filter((e) => pageEmails.has(e)));
      return next.size === prev.size ? prev : next;
    });
  }, [users]);

  // ---------- hành động hàng loạt ----------
  const runBulk = async (action: 'delete' | 'role', role?: string) => {
    const emails = [...selected];
    if (emails.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await api<BulkResult>('/admin/users/bulk', {
        method: 'POST',
        body: { action, emails, role },
      });
      const skippedNote = res.skipped && res.skipped.length > 0 ? ` · ${res.skipped.length} bỏ qua` : '';
      if (action === 'delete') {
        showToast({
          type: 'success',
          title: `Đã xóa ${res.affected} người dùng`,
          message: res.skipped?.length ? `Bỏ qua: ${res.skipped.map((s) => s.email).slice(0, 3).join(', ')}${res.skipped.length > 3 ? '…' : ''}` : undefined,
        });
      } else {
        showToast({
          type: 'success',
          title: `Đã cập nhật ${res.affected} người dùng`,
          message: `Vai trò mới: ${role === 'admin' ? 'Quản trị viên' : 'Thành viên'}${skippedNote || undefined}`,
        });
      }
      setSelected(new Set());
      setConfirmBulkDelete(false);
      await fetchUsers();
      // nếu admin tự đổi vai trò chính mình → làm mới AuthContext
      if (role && emails.includes(user?.email ?? '') && user?.email !== PROTECTED_EMAIL) {
        await refreshUser();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Thao tác hàng loạt thất bại', message: msg });
    } finally {
      setBulkBusy(false);
    }
  };

  // ---------- chỉnh sửa 1 user ----------
  const handleEdit = (u: UserData) => {
    setEditingUser(u);
    setEditRole(u.role);
    setAdjustMode('add');
    setAdjustAmount('');
  };

  // Cộng/trừ dần vào số dư hiện tại (nhập số tiền rồi bấm áp dụng).
  // Cộng tiền được ghi thành giao dịch 'admin_topup' → tính vào tổng nạp ⇒ VIP tăng hạng.
  const handleApplyAdjust = async () => {
    if (!editingUser || !adjustValid || adjusting) return;
    const delta = adjustMode === 'add' ? adjustValue : -adjustValue;
    setAdjusting(true);
    try {
      const res = await api<{
        ok: boolean;
        user: {
          balance: number;
          name: string;
          totalTopup?: number;
          vip?: { level: number; name: string; bonusPct: number } | null;
        };
        adjust?: { delta: number; newBalance: number };
        tierUp?: { level: number; name: string; bonusPct: number };
      }>('/admin/users/' + encodeURIComponent(editingUser.email), {
        method: 'PUT',
        body: { balanceAdjust: delta },
      });
      const newBalance = res.user?.balance ?? res.adjust?.newBalance ?? editingUser.balance;
      const newTotal = res.user?.totalTopup ?? editingUser.totalTopup;
      const vipInfo = res.user?.vip;
      setEditingUser((prev) => (prev ? { ...prev, balance: newBalance, totalTopup: newTotal } : prev));
      showToast({
        type: 'success',
        title: delta > 0
          ? `Đã cộng ${formatNumber(delta)}đ vào số dư`
          : `Đã trừ ${formatNumber(-delta)}đ khỏi số dư`,
        message: delta > 0
          ? `Số dư mới: ${formatNumber(newBalance)}đ · Tổng nạp: ${formatNumber(newTotal)}đ${vipInfo ? ` · VIP ${vipInfo.level} ${vipInfo.name}` : ''}`
          : `Số dư mới: ${formatNumber(newBalance)}đ · Tổng nạp & VIP không đổi`,
        duration: 4000,
      });
      if (res.tierUp) {
        setTimeout(() => {
          showToast({
            type: 'success',
            title: `👑 Lên VIP ${res.tierUp!.level} · ${res.tierUp!.name}`,
            message: `${editingUser.name} đã mở khóa hạng mới — thưởng nạp +${res.tierUp!.bonusPct}%`,
            duration: 6000,
          });
        }, 800);
      }
      setAdjustAmount('');
      fetchUsers();
      if (editingUser.email === user?.email) {
        await refreshUser();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Điều chỉnh số dư thất bại', message: msg });
    } finally {
      setAdjusting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await api('/admin/users/' + encodeURIComponent(editingUser.email), {
        method: 'PUT',
        body: { role: editRole },
      });
      showToast({ type: 'success', title: 'Cập nhật thành công' });
      setEditingUser(null);
      fetchUsers();
      if (editingUser.email === user?.email) {
        await refreshUser();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Cập nhật thất bại', message: msg });
      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Xóa người dùng ${email}?`)) return;
    try {
      await api('/admin/users/' + email, { method: 'DELETE' });
      showToast({ type: 'success', title: 'Đã xóa người dùng' });
      fetchUsers();
    } catch {
      showToast({ type: 'error', title: 'Xóa thất bại' });
    }
  };

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);
  const pages = useMemo(() => pageList(page, pageCount), [page, pageCount]);

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Bạn cần quyền quản trị viên để xem trang này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý người dùng</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quản lý tài khoản, số dư và quyền hạn · {formatNumber(total)} người dùng
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLive((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                live
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              title="Bật/tắt đồng bộ realtime cho bảng người dùng"
            >
              <Wifi className={`w-4 h-4 ${live ? 'animate-pulse' : ''}`} />
              {live ? 'Realtime: BẬT' : 'Realtime: TẮT'}
            </button>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>
      </AnimatedSection>

      {/* Thanh công cụ hàng loạt */}
      {selected.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/30 animate-fade-in"
          role="toolbar"
          aria-label="Hành động hàng loạt"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <CheckSquare className="w-4 h-4" />
            Đã chọn {selected.size} người dùng
          </span>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Xóa đã chọn
            </button>
            <button
              onClick={() => runBulk('role', 'admin')}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              Đặt làm Quản trị viên
            </button>
            <button
              onClick={() => runBulk('role', 'member')}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <UserCheck className="w-4 h-4 text-gray-500" />
              Đặt làm Thành viên
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Bỏ chọn
            </button>
            {bulkBusy && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
        </div>
      )}

      <AnimatedSection delay={100}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tìm kiếm + lọc + sắp xếp */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo email, tên hoặc khu vực..."
                className="flex-1 min-w-0 bg-transparent border-0 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/60 text-gray-800 dark:text-white placeholder-gray-400"
                aria-label="Tìm kiếm người dùng"
              />
              {search !== debouncedSearch && <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Lọc theo vai trò"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="member">Thành viên</option>
              </select>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Sắp xếp"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p>Không tìm thấy người dùng</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={toggleSelectAll}
                        disabled={selectableUsers.length === 0}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        aria-label="Chọn tất cả người dùng trên trang"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Tên</th>
                    <th className="px-4 py-3 text-left">Vai trò</th>
                    <th className="px-4 py-3 text-right">Số dư</th>
                    <th className="px-4 py-3 text-center">Gói</th>
                    <th className="px-4 py-3 text-center">Đơn</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map((u) => {
                    const isProtected = u.email === PROTECTED_EMAIL;
                    const isSelected = selected.has(u.email);
                    return (
                      <tr
                        key={u.email}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(u.email)}
                            disabled={isProtected}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`Chọn ${u.email}`}
                            title={isProtected ? 'Tài khoản admin chính không thể thao tác hàng loạt' : undefined}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white max-w-[220px] truncate">
                          {u.email}
                          {u.googleOnly && (
                            <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                              Google
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{u.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded-full ${
                              u.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {u.role === 'admin' && <Shield className="w-3 h-3" />}
                            {u.role === 'admin' ? 'Admin' : 'Thành viên'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatNumber(u.balance)}đ
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                            <Package className="w-3 h-3" />
                            {u.purchases}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{u.orderCount}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(u)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {!isProtected && (
                              <button
                                onClick={() => handleDelete(u.email)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Phân trang */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Hiển thị <span className="font-semibold text-gray-700 dark:text-gray-300">{showingFrom}–{showingTo}</span> trên{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{formatNumber(total)}</span> người dùng
              <span className="hidden sm:inline"> · trang {page}/{pageCount}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                Số dòng/trang:
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Số dòng mỗi trang"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <nav className="flex items-center gap-1" aria-label="Phân trang">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  aria-label="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pages.map((p, i) =>
                  p === '…' ? (
                    <span key={`e-${i}`} className="px-2 py-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-semibold transition-colors ${
                        p === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(pageCount)}
                  disabled={page === pageCount}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  aria-label="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Modal xác nhận xóa hàng loạt */}
      {confirmBulkDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !bulkBusy && setConfirmBulkDelete(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận xóa hàng loạt"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md overflow-hidden animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-gray-800 dark:text-white">Xóa {selected.size} người dùng?</h2>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkBusy}
                className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Hành động này sẽ <strong>xóa vĩnh viễn</strong> các tài khoản được chọn cùng toàn bộ đơn hàng,
                giao dịch và gói nâng cấp của họ.
              </p>
              <div className="max-h-32 overflow-y-auto rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 space-y-1">
                {[...selected].slice(0, 12).map((email) => (
                  <p key={email} className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{email}</p>
                ))}
                {selected.size > 12 && (
                  <p className="text-xs text-gray-400">… và {selected.size - 12} người dùng khác</p>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Tài khoản <span className="font-mono">admin@luongkun.io</span> nếu nằm trong danh sách sẽ được tự động bỏ qua.
              </p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkBusy}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => runBulk('delete')}
                disabled={bulkBusy}
                className="flex-1 py-2.5 font-bold rounded-xl transition-all bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {bulkBusy ? 'Đang xóa…' : `Xóa ${selected.size} tài khoản`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md overflow-hidden animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-bold text-gray-800 dark:text-white">Chỉnh sửa người dùng</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Email
                </label>
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-600 dark:text-gray-300 text-sm truncate">
                  {editingUser.email}
                </div>
              </div>

              {/* Số dư: hiển thị hiện tại + điều chỉnh cộng/trừ dần */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-400/10 dark:to-teal-400/10 border-b border-emerald-100/60 dark:border-emerald-500/20">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Số dư hiện tại
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatNumber(editingUser.balance)}đ
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Chọn kiểu điều chỉnh */}
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Kiểu điều chỉnh số dư">
                    <button
                      type="button"
                      onClick={() => setAdjustMode('add')}
                      aria-pressed={adjustMode === 'add'}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                        adjustMode === 'add'
                          ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:border-emerald-200 dark:hover:border-emerald-500/40'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Cộng tiền
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('sub')}
                      aria-pressed={adjustMode === 'sub'}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                        adjustMode === 'sub'
                          ? 'border-rose-400 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-sm'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:border-rose-200 dark:hover:border-rose-500/40'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" /> Trừ tiền
                    </button>
                  </div>

                  {/* Nhập số tiền */}
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="Nhập số tiền cần điều chỉnh…"
                      aria-label="Số tiền điều chỉnh"
                      className="w-full pl-4 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">đ</span>
                  </div>

                  {/* Mệnh giá nhanh */}
                  <div className="flex flex-wrap gap-1.5">
                    {ADJUST_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAdjustAmount(String(v))}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          adjustValue === v
                            ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:border-emerald-200 dark:hover:border-emerald-500/40'
                        }`}
                      >
                        {v >= 1_000_000 ? `${v / 1_000_000}tr` : `${v / 1000}k`}
                      </button>
                    ))}
                  </div>

                  {/* Xem trước kết quả */}
                  {adjustValue > 0 && (
                    <p className={`text-xs px-1 ${adjustValid ? 'text-gray-500 dark:text-gray-400' : 'text-rose-500'}`}>
                      {adjustValid ? (
                        <>
                          {formatNumber(editingUser.balance)}đ{' '}
                          <span className={adjustMode === 'add' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                            {adjustMode === 'add' ? '+' : '−'} {formatNumber(adjustValue)}đ
                          </span>{' '}
                          = <span className="font-bold text-gray-700 dark:text-gray-200">{formatNumber(previewBalance)}đ</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          Số trừ ({formatNumber(adjustValue)}đ) vượt số dư hiện tại
                        </span>
                      )}
                    </p>
                  )}

                  {/* Ảnh hưởng VIP: cộng tiền tính vào tổng nạp, trừ tiền không đổi */}
                  {adjustMode === 'add' ? (
                    adjustValue > 0 && adjustValid && (
                      <div
                        className={`rounded-lg border px-3 py-2.5 ${
                          vipUpPreview ? vipUpPreview.soft : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 font-medium whitespace-nowrap">
                            <Crown className={`w-3.5 h-3.5 ${vipNow?.tier?.crown ?? 'text-gray-400'}`} />
                            Tổng nạp VIP
                          </span>
                          <span className="truncate">
                            {formatNumber(editingUser.totalTopup)}đ{' '}
                            <span className="text-emerald-600 dark:text-emerald-400">+ {formatNumber(adjustValue)}đ</span>{' '}
                            = <span className="font-bold text-gray-700 dark:text-gray-200">{formatNumber(editingUser.totalTopup + adjustValue)}đ</span>
                          </span>
                        </div>
                        {vipUpPreview ? (
                          <p className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-bold ${vipUpPreview.text}`}>
                            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                            Lên VIP {vipUpPreview.level} · {vipUpPreview.name} — thưởng nạp +{vipUpPreview.bonusPct}%
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                            {vipAfter?.nextTier
                              ? `Còn ${formatNumber(vipAfter.remaining)}đ nữa lên VIP ${vipAfter.nextTier.level} · ${vipAfter.nextTier.name}`
                              : 'Đã đạt hạng cao nhất — VIP 4 · Kim Cương'}
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    adjustValue > 0 && adjustValid && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                        Trừ tiền chỉ giảm số dư — tổng nạp &amp; hạng VIP không thay đổi
                      </p>
                    )
                  )}

                  {/* Nút áp dụng ngay */}
                  <button
                    type="button"
                    onClick={handleApplyAdjust}
                    disabled={!adjustValid || adjusting}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      adjustMode === 'add'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {adjusting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : adjustMode === 'add' ? (
                      <Plus className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                    {adjusting
                      ? 'Đang xử lý…'
                      : adjustValue > 0
                        ? `${adjustMode === 'add' ? 'Cộng' : 'Trừ'} ${formatNumber(adjustValue)}đ vào số dư`
                        : 'Nhập số tiền để áp dụng'}
                  </button>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                    {adjustMode === 'add'
                      ? 'Cộng dồn vào số dư và tính vào tổng nạp VIP — không thay thế giá trị cũ'
                      : 'Chỉ trừ khỏi số dư hiện tại — tổng nạp VIP không đổi'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Vai trò
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none"
                >
                  <option value="member">Thành viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 font-bold rounded-xl transition-all bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
