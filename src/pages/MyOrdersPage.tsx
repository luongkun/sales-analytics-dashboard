import { useCallback, useEffect, useState } from 'react';
import { Download, Package, RefreshCw, Search, TrendingUp, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { subscribe } from '../realtime/client';
import { formatVND, formatDateTime } from '../lib/formatters';
import { MiniCart } from '../components/MiniCart';
import type { Order } from '../lib/types';

const PAGE_SIZE = 8;

export function MyOrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<string>('Tất cả');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const d = await api<{ orders: Order[] }>('/orders');
      setOrders(d.orders);
    } catch (e: any) {
      if (!silent) toast.showToast({ type: 'error', title: 'Không tải được đơn hàng', message: e.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const u1 = subscribe('order:created', (p: any) => {
      if (p?.email === user?.email) load(true);
    });
    const u2 = subscribe('order:updated', (p: any) => {
      if (p?.email === user?.email) load(true);
    });
    return () => {
      u1();
      u2();
    };
  }, [load, user?.email]);

  if (!orders) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  // KPI
  const now = Date.now();
  const activeOrders = orders.filter((o) => o.status !== 'Đã hủy');
  const spent = activeOrders.reduce((s, o) => s + o.total, 0);
  const slots = activeOrders.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);
  const lastOrder = orders[0];
  const avg = activeOrders.length ? Math.round(spent / activeOrders.length) : 0;

  const filtered = orders.filter((o) => {
    if (filter !== 'Tất cả' && o.status !== filter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const inItems = o.items.some((i) => i.name.toLowerCase().includes(needle));
      return o.id.toLowerCase().includes(needle) || inItems;
    }
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const visible = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const exportCSV = () => {
    try {
      const rows = [['Mã đơn', 'Sản phẩm', 'Số lượng', 'Tổng tiền', 'Trạng thái', 'Thời gian'], ...orders.map((o) => [o.id, o.items.map((i) => `${i.name} x${i.quantity}`).join('; '), String(o.items.reduce((s, i) => s + i.quantity, 0)), String(o.total), o.status, formatDateTime(o.timestamp)])];
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'don-hang-cua-toi.csv';
      a.click();
      toast.showToast({ type: 'success', title: 'Xuất file thành công' });
    } catch {
      toast.showToast({ type: 'error', title: 'Xuất file thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Đơn hàng của tôi</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Lịch sử {orders.length} đơn hàng bạn đã mua · cập nhật realtime
          </p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => load()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <RefreshCw size={15} /> Làm mới
          </button>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25">
            <Download size={15} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniKpi icon={Wallet} title="TỔNG CHI TIÊU" value={`${formatVND(spent)}đ`} sub={`${slots} slot đã mua`} color="text-emerald-600 dark:text-emerald-400" />
        <MiniKpi icon={Package} title="SỐ ĐƠN HÀNG" value={`${orders.length}`} sub="từ khi tạo tài khoản" color="text-blue-600 dark:text-blue-400" />
        <MiniKpi icon={TrendingUp} title="ĐƠN GẦN NHẤT" value={lastOrder ? (now - lastOrder.timestamp < 86400000 ? 'Hôm nay' : formatDateTime(lastOrder.timestamp).split(' · ')[0]) : '—'} sub={lastOrder ? formatDateTime(lastOrder.timestamp) : ''} color="text-purple-600 dark:text-purple-400" />
        <MiniKpi icon={Wallet} title="TRUNG BÌNH MỖI ĐƠN" value={`${formatVND(avg)}đ`} sub="không tính đơn đã hủy" color="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2.5">
        {['Tất cả', 'Hoàn thành', 'Đang xử lý', 'Đã hủy'].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm mã đơn / sản phẩm..."
            className="pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 w-56"
          />
        </div>
      </div>

      {/* Orders list */}
      {visible.length === 0 ? (
        <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <span className="text-4xl">🛒</span>
          <p className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-100">Chưa có đơn hàng nào</p>
          <p className="mt-1 text-sm text-gray-400">Khám phá sản phẩm và đặt slot đầu tiên của bạn</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} expanded={expanded === o.id} onToggle={() => setExpanded(expanded === o.id ? null : o.id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                pageClamped === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <MiniCart />
    </div>
  );
}

function MiniKpi({ icon: Icon, title, value, sub, color }: { icon: any; title: string; value: string; sub?: string; color: string }) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={color} />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{title}</p>
      </div>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

const STATUS_PILL: Record<string, string> = {
  'Hoàn thành': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Đang xử lý': 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Đã hủy': 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
};

function OrderCard({ order, expanded, onToggle }: { order: Order; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 flex items-center gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{order.id}</span>
            <span className="text-xs text-gray-400">{formatDateTime(order.timestamp)}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[order.status] || 'bg-gray-100 text-gray-500'}`}>{order.status}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</p>
        </div>
        <span className="text-base font-bold text-gray-900 dark:text-gray-100">{formatVND(order.total)}đ</span>
        <button
          onClick={onToggle}
          aria-label={`Xem chi tiết đơn ${order.id}`}
          className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
        >
          {expanded ? 'Thu gọn' : 'Xem chi tiết'}
        </button>
      </div>

      {order.status === 'Đang xử lý' && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-start gap-2">
          <span className="text-sm">⏳</span>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">Shop chưa gửi thông tin tài khoản cho đơn này — sẽ cập nhật ngay khi dữ liệu được chuyển.</p>
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-2.5 animate-fade-in">
          {order.items.map((i, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{i.name}</p>
                <p className="text-xs text-gray-400">
                  {i.quantity} slot{i.price ? ` · ${formatVND(i.price)} / slot · ${formatVND(i.price * i.quantity)}` : ''}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Tổng cộng</span>
            <span className="text-lg font-bold text-gradient">{formatVND(order.total)}đ</span>
          </div>
        </div>
      )}
    </div>
  );
}
