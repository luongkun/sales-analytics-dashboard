/**
 * Trang "Đơn hàng của tôi" — lịch sử các đơn hàng đã mua của người dùng đang đăng nhập.
 * Dữ liệu lấy từ GET /api/orders (orders table trong SQLite, lưu khi thanh toán bằng số dư).
 * Realtime: khi chính mình đặt đơn ở session khác → tự refetch qua socket 'order:created'.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PackageCheck,
  Receipt,
  Wallet,
  CalendarClock,
  TrendingUp,
  Search,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AnimatedSection from '../components/AnimatedSection';
import { EmptyState } from '../components/EmptyState';
import { ExportButton } from '../components/ExportButton';
import { SkeletonStatCard, SkeletonTable } from '../components/Skeleton';
import { onRealtime } from '../realtime/client';
import { products } from '../data/products';
import { formatCurrency, formatNumber } from '../data/salesData';

interface MyOrderItem {
  productId: string;
  name: string;
  quantity: number;
}

interface MyOrder {
  id: string;
  email: string;
  items: string | MyOrderItem[];
  total: number;
  status: string;
  timestamp: number;
}

const PAGE_SIZE = 8;

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  'Hoàn thành': { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', icon: CheckCircle2 },
  'Đang xử lý': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', icon: Clock },
  'Đã hủy': { color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400', icon: XCircle },
};

const STATUS_LIST = ['Tất cả', 'Hoàn thành', 'Đang xử lý', 'Đã hủy'];

/** items trong DB lưu dạng JSON string — parse an toàn */
function parseItems(raw: string | MyOrderItem[]): MyOrderItem[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MyOrderItem[]) : [];
  } catch {
    return [];
  }
}

function formatOrderDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay) return `Hôm nay · ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Hôm qua · ${time}`;
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${date} · ${time}`;
}

function formatExportDate(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN');
}

interface MyOrdersPageProps {
  onNavigate?: (page: 'products') => void;
}

const MyOrdersPage = ({ onNavigate }: MyOrdersPageProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (silent = false) => {
      try {
        setError(null);
        if (!silent) setRefreshing(true);
        const res = await api<{ ok: boolean; orders: MyOrder[] }>('/orders');
        setOrders(res.orders || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
        if (!silent) {
          showToast({ type: 'error', title: 'Không tải được đơn hàng', message: 'Vui lòng thử lại' });
        }
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: đơn mới của chính mình (đặt ở session/tab khác) → refetch âm thầm
  useEffect(() => {
    const off = onRealtime<{ email?: string }>('order:created', (payload) => {
      if (payload?.email && payload.email === user?.email) {
        load(true);
      }
    });
    return off;
  }, [load, user?.email]);

  // Realtime: admin đã gửi dữ liệu / đổi trạng thái đơn của mình → refetch âm thầm
  useEffect(() => {
    const off = onRealtime<{ email?: string; orderId?: string; status?: string }>('order:updated', (payload) => {
      if (payload?.email && payload.email === user?.email) {
        load(true);
      }
    });
    return off;
  }, [load, user?.email]);

  const allParsed = useMemo(
    () => (orders || []).map((o) => ({ ...o, parsedItems: parseItems(o.items) })),
    [orders]
  );

  const stats = useMemo(() => {
    const list = allParsed || [];
    const active = list.filter((o) => o.status !== 'Đã hủy');
    const spent = active.reduce((sum, o) => sum + o.total, 0);
    const slots = active.reduce((sum, o) => sum + o.parsedItems.reduce((s, i) => s + i.quantity, 0), 0);
    const latest = list.length > 0 ? list[0].timestamp : 0;
    return {
      count: list.length,
      spent,
      slots,
      latest,
      avg: active.length > 0 ? Math.round(spent / active.length) : 0,
    };
  }, [allParsed]);

  const filtered = useMemo(() => {
    let result = allParsed;
    if (statusFilter !== 'Tất cả') {
      result = result.filter((o) => o.status === statusFilter);
    }
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(term) ||
          o.parsedItems.some((i) => i.name.toLowerCase().includes(term))
      );
    }
    return result;
  }, [allParsed, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset về trang 1 khi đổi bộ lọc/tìm kiếm
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const priceOf = (productId: string): number | null => {
    const p = products.find((pr) => pr.id === productId);
    return p ? p.price : null;
  };

  // ----- Trạng thái tải -----
  if (orders === null && !error) {
    return (
      <div aria-busy="true" aria-label="Đang tải đơn hàng của bạn">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={6} columns={5} />
      </div>
    );
  }

  if (error && orders === null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
        <p className="text-5xl mb-4" aria-hidden="true">📡</p>
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Không tải được đơn hàng</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        <button
          onClick={() => load()}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  const list = orders || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedSection delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <PackageCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Đơn hàng của tôi</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 ml-[52px] sm:ml-0">
              Lịch sử {formatNumber(stats.count)} đơn hàng bạn đã mua · cập nhật realtime
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
              aria-label="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            {list.length > 0 && (
              <ExportButton
                data={allParsed.map((o) => ({
                  id: o.id,
                  items: o.parsedItems.map((i) => `${i.name} ×${i.quantity}`).join(', '),
                  total: o.total,
                  status: o.status,
                  date: formatExportDate(o.timestamp),
                }))}
                filename="don-hang-cua-toi"
                columns={[
                  { key: 'id', label: 'Mã đơn' },
                  { key: 'items', label: 'Sản phẩm' },
                  { key: 'total', label: 'Tổng tiền' },
                  { key: 'status', label: 'Trạng thái' },
                  { key: 'date', label: 'Ngày đặt' },
                ]}
                className="!bg-gradient-to-r !from-blue-500 !to-indigo-600 shadow-lg shadow-indigo-500/25"
              >
                Xuất CSV
              </ExportButton>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* Stats */}
      <AnimatedSection delay={100}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tổng chi tiêu</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2 tabular-nums">{formatCurrency(stats.spent)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatNumber(stats.slots)} slot đã mua</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Số đơn hàng</p>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2 tabular-nums">{formatNumber(stats.count)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">từ khi tạo tài khoản</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Đơn gần nhất</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
              {stats.latest ? formatOrderDate(stats.latest).split(' · ')[0] : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.latest ? formatOrderDate(stats.latest) : 'chưa có giao dịch'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trung bình mỗi đơn</p>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2 tabular-nums">{formatCurrency(stats.avg)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">không tính đơn đã hủy</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Empty state */}
      {list.length === 0 ? (
        <AnimatedSection delay={200}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12">
            <EmptyState
              icon={ShoppingBag}
              title="Bạn chưa mua đơn hàng nào"
              description="Khám phá các sản phẩm và gói dịch vụ, thêm vào giỏ và thanh toán bằng số dư — đơn hàng sẽ hiện tại đây."
              action={
                <button
                  onClick={() => onNavigate?.('products')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <Package className="w-4 h-4" />
                  Khám phá sản phẩm
                </button>
              }
            />
          </div>
        </AnimatedSection>
      ) : (
        <>
          {/* Toolbar: search + status chips */}
          <AnimatedSection delay={200}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
              <div className="relative lg:max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã đơn hoặc sản phẩm..."
                  aria-label="Tìm kiếm đơn hàng"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo trạng thái">
                {STATUS_LIST.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                      statusFilter === s
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-pressed={statusFilter === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Danh sách đơn */}
          <AnimatedSection delay={300}>
            <div className="space-y-3" role="list" aria-label="Danh sách đơn hàng của tôi">
              {pageRows.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12">
                  <EmptyState
                    icon={Search}
                    title="Không tìm thấy đơn hàng"
                    description="Thử đổi từ khóa hoặc bộ lọc trạng thái khác."
                  />
                </div>
              ) : (
                pageRows.map((o) => {
                  const meta = STATUS_META[o.status] || {
                    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                    icon: Package,
                  };
                  const StatusIcon = meta.icon;
                  const isExpanded = expanded.has(o.id);
                  return (
                    <div
                      key={o.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                      role="listitem"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 dark:from-blue-400/15 dark:to-indigo-500/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono font-bold text-gray-800 dark:text-white truncate">{o.id}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatOrderDate(o.timestamp)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${meta.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {o.status}
                            </span>
                            <p className={`text-lg font-bold tabular-nums whitespace-nowrap ${o.status === 'Đã hủy' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gradient'}`}>
                              {formatCurrency(o.total)}
                            </p>
                          </div>
                        </div>

                        {/* Tóm tắt items */}
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 truncate">
                          {o.parsedItems.length > 0
                            ? o.parsedItems.map((i) => `${i.name} ×${i.quantity}`).join(' · ')
                            : '—'}
                        </p>
                        {o.status === 'Đang xử lý' && (
                          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            Shop chưa gửi thông tin tài khoản cho đơn này — sẽ cập nhật ngay khi dữ liệu được chuyển.
                          </p>
                        )}

                        {/* Nút mở chi tiết */}
                        {o.parsedItems.length > 0 && (
                          <button
                            onClick={() => toggleExpand(o.id)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            aria-expanded={isExpanded}
                            aria-label={`Xem chi tiết đơn ${o.id}`}
                          >
                            {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}

                        {/* Chi tiết items */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 animate-fade-in">
                            {o.parsedItems.map((i, idx) => {
                              const unitPrice = priceOf(i.productId);
                              return (
                                <div key={`${i.productId}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                                      {i.quantity}×
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-200 truncate">{i.name}</span>
                                  </div>
                                  <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                                    {unitPrice !== null
                                      ? `${formatCurrency(unitPrice)} / slot · ${formatCurrency(unitPrice * i.quantity)}`
                                      : `${i.quantity} slot`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </AnimatedSection>

          {/* Phân trang */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Hiển thị <span className="font-semibold text-gray-700 dark:text-gray-300">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</span>{' '}
                trên <span className="font-semibold text-gray-700 dark:text-gray-300">{formatNumber(filtered.length)}</span> đơn hàng
              </p>
              <div className="flex items-center gap-1.5" role="navigation" aria-label="Phân trang">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Trang trước"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pageCount || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-gray-400">…</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`min-w-[32px] h-8 px-2 text-sm font-semibold rounded-lg transition-colors ${
                          p === safePage
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        aria-current={p === safePage ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage === pageCount}
                  className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Trang sau"
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyOrdersPage;
