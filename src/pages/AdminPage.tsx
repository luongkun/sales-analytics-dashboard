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
  Send,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Landmark,
  Webhook,
  KeyRound,
  Eye,
  EyeOff,
  History,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNumber } from '../data/salesData';
import { getVipInfo, VIP_TIERS } from '../utils/vip';
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
  /** tổng tiền đã nạp (nạp thật + admin cộng tay) — quyết định hạng VIP khi tự động */
  totalTopup: number;
  /** null = VIP tự động theo tổng nạp · 0 = không VIP · 1-4 = admin đặt hạng cứng */
  vipOverride: number | null;
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

interface AdminOrderItem {
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

interface AdminOrder {
  id: string;
  email: string;
  name: string;
  items: AdminOrderItem[];
  total: number;
  status: string;
  timestamp: number;
}

interface OrdersPageResponse {
  ok: boolean;
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// ===== Cổng thanh toán VietQR (webhook Casso/SePay) =====

interface GatewayConfig {
  ok: boolean;
  endpoint: string;
  secret: string;
  auth: { hmacHeader: string; hmacAlgo: string; secretQuery: string; altQuery: string };
  bank: { name: string; short: string; accountNo: string; accountName: string };
  ttlMinutes: number;
}

interface PaymentRowData {
  id: string;
  email: string;
  content: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  result: { amount?: number; bonus?: number; balance?: number; source?: string } | null;
}

interface WebhookLogRow {
  id: number;
  ts: number;
  ip: string | null;
  provider: string;
  ok: number;
  reason: string | null;
  content: string | null;
  amount: number | null;
}

function fmtGatewayTime(ts: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', { hour12: false });
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

function formatOrderDate(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

const ORDER_STATUS_PILL: Record<string, string> = {
  'Hoàn thành': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  'Đang xử lý': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  'Đã hủy': 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const ORDER_STATUS_FILTERS = ['Đang xử lý', 'Hoàn thành', 'Đã hủy', 'Tất cả'];

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
  const [editVip, setEditVip] = useState<string>('auto');
  const [saving, setSaving] = useState(false);

  // --- điều chỉnh số dư (cộng/trừ dần, không set tuyệt đối) ---
  const [adjustMode, setAdjustMode] = useState<'add' | 'sub'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // --- tab: Người dùng / Đơn hàng / Cổng thanh toán ---
  const [tab, setTab] = useState<'users' | 'orders' | 'payments'>('users');

  // --- danh sách đơn hàng (server-side, lọc trạng thái + tìm kiếm) ---
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageCount, setOrdersPageCount] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('Đang xử lý');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [debouncedOrdersSearch, setDebouncedOrdersSearch] = useState('');
  const [busyOrder, setBusyOrder] = useState<string | null>(null);

  const adjustValue = parseInt(adjustAmount, 10) || 0;
  const adjustValid = adjustValue > 0 && (adjustMode === 'add' || adjustValue <= (editingUser?.balance ?? 0));
  const previewBalance = editingUser ? Math.max(0, editingUser.balance + (adjustMode === 'add' ? adjustValue : -adjustValue)) : 0;

  // Xem trước ảnh hưởng VIP: cộng tiền tính vào tổng nạp, trừ tiền không đổi (override cứng thì không đổi)
  const vipNow = editingUser ? getVipInfo(editingUser.totalTopup, editingUser.vipOverride) : null;
  const vipAfter = editingUser
    ? getVipInfo(adjustMode === 'add' && adjustValue > 0 ? editingUser.totalTopup + adjustValue : editingUser.totalTopup, editingUser.vipOverride)
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

  // debounce ô tìm kiếm đơn hàng
  const ordersSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (ordersSearchTimer.current) clearTimeout(ordersSearchTimer.current);
    ordersSearchTimer.current = setTimeout(() => {
      setDebouncedOrdersSearch(ordersSearch.trim());
      setOrdersPage(1);
    }, 350);
    return () => {
      if (ordersSearchTimer.current) clearTimeout(ordersSearchTimer.current);
    };
  }, [ordersSearch]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(ordersPage),
        pageSize: '10',
        status: orderStatusFilter,
        q: debouncedOrdersSearch,
      });
      const res = await api<OrdersPageResponse>(`/admin/orders?${params.toString()}`);
      setOrders(res.orders);
      setOrdersTotal(res.total);
      setOrdersPageCount(res.pageCount);
      setOrdersPage(res.page); // server có thể clamp
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Không thể tải danh sách đơn hàng', message: msg });
    } finally {
      setOrdersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPage, orderStatusFilter, debouncedOrdersSearch]);

  useEffect(() => {
    if (isAdmin && tab === 'orders') fetchOrders();
  }, [fetchOrders, isAdmin, tab]);

  // --- cổng thanh toán: config webhook + giao dịch + log ---
  const [gwConfig, setGwConfig] = useState<GatewayConfig | null>(null);
  const [payments, setPayments] = useState<PaymentRowData[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [logs, setLogs] = useState<WebhookLogRow[]>([]);
  const [gwLoading, setGwLoading] = useState(true);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customSecret, setCustomSecret] = useState('');
  const [secretBusy, setSecretBusy] = useState(false);
  const [simRow, setSimRow] = useState<string | null>(null);

  const fetchGateway = useCallback(async () => {
    setGwLoading(true);
    try {
      const [cfg, pay, lg] = await Promise.all([
        api<GatewayConfig>('/admin/payments/config'),
        api<{ ok: boolean; payments: PaymentRowData[]; total: number }>('/admin/payments?limit=25'),
        api<{ ok: boolean; logs: WebhookLogRow[] }>('/admin/payments/logs?limit=50'),
      ]);
      setGwConfig(cfg);
      setPayments(pay.payments || []);
      setPaymentsTotal(pay.total || 0);
      setLogs(lg.logs || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Không tải được cấu hình cổng thanh toán', message: msg });
    } finally {
      setGwLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAdmin && tab === 'payments') fetchGateway();
  }, [fetchGateway, isAdmin, tab]);

  const copyGatewayText = (text: string, key: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(key);
        showToast({ type: 'success', title: `Đã sao chép ${label}` });
        setTimeout(() => setCopiedField((f) => (f === key ? null : f)), 1800);
      })
      .catch(() => showToast({ type: 'error', title: 'Không thể sao chép' }));
  };

  /** Đặt secret tuỳ ý (dán API key Casso/SePay) hoặc để trống = xoay ngẫu nhiên */
  const applySecret = async (custom?: string) => {
    if (secretBusy) return;
    if (custom && !/^[A-Za-z0-9_-]{12,128}$/.test(custom)) {
      showToast({
        type: 'error',
        title: 'Secret không hợp lệ',
        message: '12–128 ký tự: chữ, số, gạch dưới/giữa (API key Casso thường là UUID)',
      });
      return;
    }
    if (!custom && !confirm('Xoay webhook secret mới? Secret cũ sẽ vô hiệu ngay lập tức.')) return;
    setSecretBusy(true);
    try {
      const res = await api<{ ok: boolean; secret: string }>('/admin/payments/config/secret', {
        method: 'POST',
        body: custom ? { secret: custom } : {},
      });
      setGwConfig((c) => (c ? { ...c, secret: res.secret } : c));
      setCustomSecret('');
      setSecretRevealed(true);
      showToast({ type: 'success', title: custom ? 'Đã đặt webhook secret mới' : 'Đã xoay secret ngẫu nhiên' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showToast({ type: 'error', title: 'Không đổi được secret', message: msg });
    } finally {
      setSecretBusy(false);
    }
  };

  /** Admin mô phỏng nhận tiền cho 1 mã pending — test flow khi chưa nối ngân hàng */
  const simulatePayment = async (row: PaymentRowData) => {
    if (simRow) return;
    setSimRow(row.id);
    try {
      await api(`/payments/${row.id}/simulate`, { method: 'POST' });
      showToast({ type: 'success', title: `Đã mô phỏng nhận tiền ${row.content}`, message: `+${formatNumber(row.amount)}đ cho ${row.email}` });
      fetchGateway();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showToast({ type: 'error', title: 'Mô phỏng thất bại', message: msg });
    } finally {
      setSimRow(null);
    }
  };

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

  // realtime cho tab Đơn hàng: có đơn mới / trạng thái đổi → tự làm mới
  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;
  const ordersRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!live || !isAdmin || tab !== 'orders') return;
    const handle = () => {
      if (ordersRefreshTimer.current) clearTimeout(ordersRefreshTimer.current);
      ordersRefreshTimer.current = setTimeout(() => fetchOrdersRef.current(), 400);
    };
    const offs = [onRealtime('order:created', handle), onRealtime('analytics:changed', handle)];
    return () => {
      offs.forEach((off) => off());
      if (ordersRefreshTimer.current) clearTimeout(ordersRefreshTimer.current);
    };
  }, [live, isAdmin, tab]);

  // ---------- cập nhật trạng thái đơn (admin đã gửi dữ liệu cho khách) ----------
  const handleSetOrderStatus = async (orderId: string, email: string, status: string) => {
    if (busyOrder) return;
    setBusyOrder(orderId);
    try {
      await api('/admin/orders/' + encodeURIComponent(orderId), {
        method: 'PUT',
        body: { status },
      });
      showToast({
        type: 'success',
        title:
          status === 'Hoàn thành'
            ? `Đơn ${orderId} đã hoàn thành`
            : status === 'Đã hủy'
              ? `Đơn ${orderId} đã hủy`
              : `Đơn ${orderId} mở lại`,
        message:
          status === 'Hoàn thành'
            ? `Đã ghi nhận gửi đầy đủ thông tin cho ${email}.`
            : status === 'Đang xử lý'
              ? 'Đơn quay về trạng thái chưa gửi dữ liệu.'
              : undefined,
      });
      await fetchOrders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Cập nhật trạng thái thất bại', message: msg });
    } finally {
      setBusyOrder(null);
    }
  };

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
    setEditVip(
      u.vipOverride === null || u.vipOverride === undefined ? 'auto' : String(u.vipOverride)
    );
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
          vipOverride?: number | null;
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
      setEditingUser((prev) => (prev ? { ...prev, balance: newBalance, totalTopup: newTotal, vipOverride: res.user?.vipOverride ?? prev.vipOverride } : prev));
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
    const vipBody: number | null = editVip === 'auto' ? null : Number(editVip);
    try {
      await api('/admin/users/' + encodeURIComponent(editingUser.email), {
        method: 'PUT',
        body: { role: editRole, vipOverride: vipBody },
      });
      const prevLabel = editingUser.vipOverride == null
        ? (vipNow?.tier ? `VIP ${vipNow.tier.level} · ${vipNow.tier.name} (tự động)` : 'chưa có hạng (tự động)')
        : editingUser.vipOverride === 0
          ? 'không có VIP'
          : `VIP ${editingUser.vipOverride} (đặt cứng)`;
      const nextLabel =
        editVip === 'auto'
          ? (vipNow?.tier ? `tự động — VIP ${vipNow.tier.level} · ${vipNow.tier.name}` : 'tự động theo tổng nạp')
          : editVip === '0'
            ? 'không có VIP'
            : `VIP ${VIP_TIERS[Number(editVip) - 1].level} · ${VIP_TIERS[Number(editVip) - 1].name}`;
      showToast({
        type: 'success',
        title: 'Cập nhật thành công',
        message: `Hạng VIP: ${prevLabel} → ${nextLabel}`,
        duration: 4000,
      });
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
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quản trị</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tab === 'users'
                ? `Quản lý tài khoản, số dư và quyền hạn · ${formatNumber(total)} người dùng`
                : tab === 'orders'
                  ? `Chuyển dữ liệu đơn hàng cho khách · ${formatNumber(ordersTotal)} đơn`
                  : `VietQR động · webhook đối soát tự động · ${formatNumber(paymentsTotal)} giao dịch`}
            </p>
            {/* Tab chuyển đổi */}
            <div className="flex items-center gap-1 mt-3 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl w-fit" role="tablist" aria-label="Chọn mục quản trị">
              <button
                role="tab"
                aria-selected={tab === 'users'}
                onClick={() => setTab('users')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  tab === 'users'
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                Người dùng
              </button>
              <button
                role="tab"
                aria-selected={tab === 'orders'}
                onClick={() => setTab('orders')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  tab === 'orders'
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Package className="w-4 h-4" />
                Đơn hàng
              </button>
              <button
                role="tab"
                aria-selected={tab === 'payments'}
                onClick={() => setTab('payments')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  tab === 'payments'
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Landmark className="w-4 h-4" />
                Cổng thanh toán
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLive((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                live
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              title="Bật/tắt đồng bộ realtime cho bảng"
            >
              <Wifi className={`w-4 h-4 ${live ? 'animate-pulse' : ''}`} />
              {live ? 'Realtime: BẬT' : 'Realtime: TẮT'}
            </button>
            <button
              onClick={() => {
                if (tab === 'users') fetchUsers();
                else if (tab === 'orders') fetchOrders();
                else fetchGateway();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>
      </AnimatedSection>

      {/* Thanh công cụ hàng loạt */}
      {tab === 'users' && selected.size > 0 && (
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              Đặt làm Quản trị viên
            </button>
            <button
              onClick={() => runBulk('role', 'member')}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
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

      {tab === 'users' && (
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
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  aria-label="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
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
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(pageCount)}
                  disabled={page === pageCount}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  aria-label="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </AnimatedSection>
      )}

      {/* ---------- TAB ĐƠN HÀNG: chuyển dữ liệu cho khách ---------- */}
      {tab === 'orders' && (
      <AnimatedSection delay={100}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Giải thích quy trình + tìm kiếm + lọc trạng thái */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl px-3.5 py-2.5">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                Đơn <strong>Đang xử lý</strong> = shop chưa gửi thông tin tài khoản cho khách.
                Sau khi gửi đầy đủ dữ liệu, bấm <strong>Đã gửi thông tin</strong> để hoàn tất đơn.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  placeholder="Tìm mã ĐH, email, tên..."
                  className="bg-transparent border-0 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/60 text-sm text-gray-800 dark:text-white placeholder-gray-400 w-40 sm:w-48"
                  aria-label="Tìm kiếm đơn hàng"
                />
                {ordersSearch !== debouncedOrdersSearch && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 flex-shrink-0" />}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
            {ORDER_STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setOrderStatusFilter(s);
                  setOrdersPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  orderStatusFilter === s
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-pressed={orderStatusFilter === s}
              >
                {s}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
              {orderStatusFilter === 'Đang xử lý' ? 'Hàng đợi gửi dữ liệu' : 'Kết quả lọc'}
            </span>
          </div>

          <div className="overflow-x-auto">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mb-3 opacity-50" />
                <p>Không có đơn hàng nào {orderStatusFilter !== 'Tất cả' ? `ở trạng thái "${orderStatusFilter}"` : ''}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã ĐH</th>
                    <th className="px-4 py-3 text-left">Khách hàng</th>
                    <th className="px-4 py-3 text-left">Sản phẩm</th>
                    <th className="px-4 py-3 text-center">SL</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                    <th className="px-4 py-3 text-left">Ngày đặt</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((o) => {
                    const firstItem = o.items[0];
                    const extra = o.items.length > 1 ? ` +${o.items.length - 1}` : '';
                    const qty = o.items.reduce((s, it) => s + (it.quantity && it.quantity > 0 ? it.quantity : 1), 0);
                    const isBusy = busyOrder === o.id;
                    return (
                      <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">{o.id}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-gray-700 dark:text-gray-300 truncate font-medium">{o.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{o.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                          {(firstItem?.name ?? '—') + extra}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            ×{qty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatNumber(o.total)}đ
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatOrderDate(o.timestamp)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${ORDER_STATUS_PILL[o.status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {o.status === 'Hoàn thành' && <CheckCircle2 className="w-3 h-3" />}
                            {o.status === 'Đang xử lý' && <Clock className="w-3 h-3" />}
                            {o.status === 'Đã hủy' && <XCircle className="w-3 h-3" />}
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {o.status === 'Đang xử lý' ? (
                              <>
                                <button
                                  onClick={() => handleSetOrderStatus(o.id, o.email, 'Hoàn thành')}
                                  disabled={isBusy || busyOrder !== null}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 disabled:opacity-50 transition-colors whitespace-nowrap"
                                  title="Đánh dấu đã gửi đầy đủ thông tin tài khoản cho khách"
                                >
                                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                  Đã gửi thông tin
                                </button>
                                <button
                                  onClick={() => handleSetOrderStatus(o.id, o.email, 'Đã hủy')}
                                  disabled={isBusy || busyOrder !== null}
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                                  title="Hủy đơn hàng"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleSetOrderStatus(o.id, o.email, 'Đang xử lý')}
                                disabled={isBusy || busyOrder !== null}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                                title="Mở lại — đơn chưa hoàn tất gửi dữ liệu"
                              >
                                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                Mở lại
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

          {/* Phân trang đơn hàng */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Hiển thị <span className="font-semibold text-gray-700 dark:text-gray-300">{ordersTotal === 0 ? 0 : (ordersPage - 1) * 10 + 1}–{Math.min(ordersPage * 10, ordersTotal)}</span> trên{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{formatNumber(ordersTotal)}</span> đơn
              <span className="hidden sm:inline"> · trang {ordersPage}/{ordersPageCount}</span>
            </div>
            <nav className="flex items-center gap-1" aria-label="Phân trang đơn hàng">
              <button
                onClick={() => setOrdersPage(1)}
                disabled={ordersPage === 1}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                aria-label="Trang đầu"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                disabled={ordersPage === 1}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageList(ordersPage, ordersPageCount).map((p, i) =>
                p === '…' ? (
                  <span key={`oe-${i}`} className="px-2 py-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setOrdersPage(p)}
                    aria-current={p === ordersPage ? 'page' : undefined}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-semibold transition-colors ${
                      p === ordersPage
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setOrdersPage((p) => Math.min(ordersPageCount, p + 1))}
                disabled={ordersPage === ordersPageCount}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOrdersPage(ordersPageCount)}
                disabled={ordersPage === ordersPageCount}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                aria-label="Trang cuối"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </nav>
          </div>
        </div>
      </AnimatedSection>
      )}

      {/* ---------- TAB CỔNG THANH TOÁN: VietQR động + webhook bảo mật ---------- */}
      {tab === 'payments' && (
      <AnimatedSection delay={100}>
        <div className="space-y-6">
          {gwLoading && !gwConfig ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang tải cấu hình cổng thanh toán…
            </div>
          ) : !gwConfig ? (
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
              Không tải được cấu hình — bấm Làm mới để thử lại.
            </div>
          ) : (
            <>
              {/* ===== Card 1: Cấu hình webhook ===== */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30">
                    <Webhook className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-800 dark:text-white">Webhook nhận tiền (bảo mật bắt buộc)</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      HMAC-SHA256 hoặc secret · rate-limit 30 req/phút/IP · audit toàn bộ request · idempotent
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đang bảo vệ
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Endpoint */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      URL webhook (dán vào Casso / SePay)
                    </label>
                    <div className="mt-1.5 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                      <code className="flex-1 min-w-0 truncate text-sm font-mono text-blue-600 dark:text-blue-400">
                        {`${window.location.origin}${gwConfig.endpoint}`}
                      </code>
                      <button
                        onClick={() => copyGatewayText(`${window.location.origin}${gwConfig.endpoint}`, 'endpoint', 'URL webhook')}
                        className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-colors"
                        aria-label="Sao chép URL webhook"
                      >
                        {copiedField === 'endpoint' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Secret */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      Webhook secret
                    </label>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                        <code className="flex-1 min-w-0 truncate text-sm font-mono text-gray-700 dark:text-gray-300">
                          {secretRevealed ? gwConfig.secret : '•'.repeat(Math.min(24, gwConfig.secret.length))}
                        </code>
                        <button
                          onClick={() => setSecretRevealed((v) => !v)}
                          className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          aria-label={secretRevealed ? 'Ẩn secret' : 'Hiện secret'}
                        >
                          {secretRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyGatewayText(gwConfig.secret, 'secret', 'webhook secret')}
                          className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-colors"
                          aria-label="Sao chép secret"
                        >
                          {copiedField === 'secret' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={() => applySecret()}
                        disabled={secretBusy}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-colors"
                      >
                        {secretBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Xoay secret
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
                      Cách xác thực (1 trong 2): <strong>header</strong>{' '}
                      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">x-casso-signature</code>{' '}
                      = HMAC-SHA256 hex của body · hoặc <strong>query</strong>{' '}
                      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">?secret=…</code>{' '}
                      (SePay: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">?api_key=…</code>)
                    </p>
                  </div>

                  {/* Đặt secret tuỳ ý = dán API key Casso/SePay */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 p-3.5 rounded-xl border border-dashed border-violet-300 dark:border-violet-500/40 bg-violet-50/60 dark:bg-violet-500/10">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        Dán API key của Casso / SePay (tuỳ chọn)
                      </label>
                      <input
                        type="text"
                        value={customSecret}
                        onChange={(e) => setCustomSecret(e.target.value)}
                        placeholder="VD: c2e11d97-a1b2-… (API key Casso) hoặc key SePay"
                        className="mt-1.5 w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        aria-label="API key cổng thanh toán"
                      />
                    </div>
                    <button
                      onClick={() => applySecret(customSecret.trim())}
                      disabled={secretBusy || !customSecret.trim()}
                      className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-600 shadow-lg shadow-fuchsia-500/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 transition-all"
                    >
                      Đặt làm secret
                    </button>
                  </div>
                </div>
              </div>

              {/* ===== Card 2: Tài khoản nhận tiền + hướng dẫn nối cổng ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tài khoản */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/30">
                      <Landmark className="w-4.5 h-4.5 text-white" />
                    </div>
                    <h2 className="font-bold text-gray-800 dark:text-white text-sm">Tài khoản nhận tiền</h2>
                  </div>
                  <div className="p-4 space-y-2.5 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Ngân hàng</span>
                      <span className="font-semibold text-gray-800 dark:text-white">{gwConfig.bank.name} ({gwConfig.bank.short})</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Số tài khoản</span>
                      <button
                        onClick={() => copyGatewayText(gwConfig.bank.accountNo, 'stk', 'số tài khoản')}
                        className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {gwConfig.bank.accountNo}
                        {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-50" />}
                      </button>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Chủ TK</span>
                      <span className="font-semibold text-gray-800 dark:text-white truncate">{gwConfig.bank.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Mã QR sống</span>
                      <span className="font-semibold text-gray-800 dark:text-white">{gwConfig.ttlMinutes} phút</span>
                    </div>
                    <div className="pt-2 mt-1 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      QR VietQR chuẩn Napas — app ngân hàng quét tự điền STK + tiền + nội dung
                    </div>
                  </div>
                </div>

                {/* Hướng dẫn Casso */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                      <Zap className="w-4.5 h-4.5 text-white" />
                    </div>
                    <h2 className="font-bold text-gray-800 dark:text-white text-sm">Nối Casso (tự động nhất)</h2>
                  </div>
                  <ol className="p-4 space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300 list-decimal list-inside">
                    <li>Đăng ký <strong>casso.vn</strong> → Kết nối tài khoản Vietcombank <span className="font-mono">{gwConfig.bank.accountNo}</span></li>
                    <li>Mục <strong>Tích hợp → API</strong> → tạo API key</li>
                    <li>Dán API key vào ô "Dán API key Casso" bên trên → Đặt làm secret</li>
                    <li>Mục <strong>Webhook</strong> → thêm URL webhook bên trên, sự kiện <em>"Khi có giao dịch nhận tiền"</em></li>
                    <li>Chuyển thử 10.000đ với nội dung <span className="font-mono">NAPxxxxxx</span> — tiền tự cộng!</li>
                  </ol>
                </div>

                {/* Hướng dẫn SePay */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/30">
                      <Send className="w-4.5 h-4.5 text-white" />
                    </div>
                    <h2 className="font-bold text-gray-800 dark:text-white text-sm">Nối SePay</h2>
                  </div>
                  <ol className="p-4 space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300 list-decimal list-inside">
                    <li>Đăng ký <strong>sepay.vn</strong> → thêm tài khoản ngân hàng VCB <span className="font-mono">{gwConfig.bank.accountNo}</span></li>
                    <li>Mục <strong>Tài khoản ngân hàng → Webhook</strong> → tạo mới</li>
                    <li>Dán URL webhook bên trên · Kiểu dữ liệu: <em>"Tất cả"</em> · Khi nhận tiền</li>
                    <li>API key của SePay dán vào ô secret bên trên (gửi kèm <span className="font-mono">?api_key=…</span>)</li>
                    <li>Webhook URL test có sẵn — bấm thử để kiểm tra kết nối</li>
                  </ol>
                </div>
              </div>

              {/* ===== Card 3: Giao dịch VietQR ===== */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30">
                      <Landmark className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800 dark:text-white text-sm">Giao dịch VietQR ({formatNumber(paymentsTotal)})</h2>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">25 giao dịch gần nhất</p>
                    </div>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900/95 backdrop-blur z-10">
                      <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-2.5 font-semibold">Mã CK</th>
                        <th className="px-4 py-2.5 font-semibold">Khách</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Số tiền</th>
                        <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                        <th className="px-4 py-2.5 font-semibold">Thời gian</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                            Chưa có giao dịch VietQR nào
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                            <td className="px-4 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{p.content}</td>
                            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 max-w-[160px] truncate" title={p.email}>{p.email}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-800 dark:text-white whitespace-nowrap">{formatNumber(p.amount)}đ</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {p.status === 'paid' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> Đã nhận
                                </span>
                              )}
                              {p.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                                  <Clock className="w-3 h-3" /> Chờ CK
                                </span>
                              )}
                              {p.status === 'expired' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                                  <XCircle className="w-3 h-3" /> Hết hạn
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {fmtGatewayTime(p.status === 'paid' ? p.paidAt || p.createdAt : p.createdAt)}
                              {p.result?.source && (
                                <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">({p.result.source})</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {p.status === 'pending' && (
                                <button
                                  onClick={() => simulatePayment(p)}
                                  disabled={simRow === p.id}
                                  title="Mô phỏng webhook ngân hàng báo tiền về (test khi chưa nối cổng)"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10 disabled:opacity-50 transition-colors"
                                >
                                  {simRow === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                  Mô phỏng
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ===== Card 4: Log webhook (audit) ===== */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 rounded-xl flex items-center justify-center shadow-md">
                      <History className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800 dark:text-white text-sm">Log webhook (audit bảo mật)</h2>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">50 request gần nhất — cả bị chặn lẫn thành công</p>
                    </div>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900/95 backdrop-blur z-10">
                      <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-2.5 font-semibold">Thời gian</th>
                        <th className="px-4 py-2.5 font-semibold">IP</th>
                        <th className="px-4 py-2.5 font-semibold">Nguồn</th>
                        <th className="px-4 py-2.5 font-semibold">Kết quả</th>
                        <th className="px-4 py-2.5 font-semibold">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                            Chưa có request webhook nào — nối Casso/SePay hoặc dùng nút Mô phỏng
                          </td>
                        </tr>
                      ) : (
                        logs.map((l) => (
                          <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtGatewayTime(l.ts)}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">{l.ip || '—'}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{l.provider}</span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {l.ok ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold">
                                  <XCircle className="w-3 h-3" /> Chặn
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[320px] truncate" title={l.reason || ''}>
                              {l.reason || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </AnimatedSection>
      )}

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
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
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
                          = <span className="font-bold text-gray-700 dark:text-gray-300">{formatNumber(previewBalance)}đ</span>
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
                            = <span className="font-bold text-gray-700 dark:text-gray-300">{formatNumber(editingUser.totalTopup + adjustValue)}đ</span>
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

              {/* Hạng VIP: tự động theo tổng nạp hoặc đặt cứng theo ý admin */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Hạng VIP
                </label>
                <select
                  value={editVip}
                  onChange={(e) => setEditVip(e.target.value)}
                  aria-label="Chọn hạng VIP"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none"
                >
                  <option value="auto">
                    Tự động — theo tổng nạp ({formatNumber(editingUser.totalTopup)}đ
                    {vipNow?.tier ? ` · hiện VIP ${vipNow.tier.level} ${vipNow.tier.name}` : ' · chưa đạt hạng'})
                  </option>
                  <option value="0">Không có VIP (ẩn hạng)</option>
                  {VIP_TIERS.map((t) => (
                    <option key={t.level} value={String(t.level)}>
                      VIP {t.level} · {t.name} — thưởng nạp +{t.bonusPct}%
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
                  {editVip === 'auto'
                    ? 'Hạng tự động tăng theo tổng tiền đã nạp của tài khoản này.'
                    : editVip === '0'
                      ? 'Tài khoản sẽ hiển thị không có hạng VIP dù tổng nạp đã đạt ngưỡng.'
                      : 'Đặt cứng hạng này — không tự tăng theo tổng nạp, thưởng nạp áp dụng ngay theo hạng đã chọn.'}
                </p>
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
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 font-bold rounded-xl transition-all bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
