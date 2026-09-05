import { useState, useEffect, useRef, ComponentType } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  Banknote,
  CreditCard,
  Sparkles,
  BadgeCheck,
  X,
  Crown,
  QrCode,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  RotateCcw,
  Landmark,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNumber } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';
import { getVipInfo } from '../utils/vip';
import { api } from '../api';
import momoQr from '../assets/momo.jpg';

const PRESETS = [50000, 100000, 200000, 500000, 1000000, 2000000];

const MOMO_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/MoMo_Logo_App.svg';

const METHODS: {
  id: string;
  label: string;
  sub: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  img?: string;
}[] = [
  { id: 'bank', label: 'Chuyển khoản ngân hàng', sub: 'VietQR động · tự động cộng tiền', icon: Banknote, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'card', label: 'Thẻ ngân hàng', sub: 'Visa · Mastercard', icon: CreditCard, gradient: 'from-purple-500 to-fuchsia-600' },
  { id: 'momo', label: 'Ví điện tử MoMo', sub: 'Quét mã QR · nhận tiền ngay', icon: Banknote, gradient: 'from-[#A50064] to-[#7C0050]', img: MOMO_LOGO },
];

// ===== Types cho thanh toán VietQR động =====
interface TopupResult {
  ok: boolean;
  amount: number;
  balance: number;
  bonus: number;
  baseBonus: number;
  vipBonus: number;
  totalTopup: number;
  tierUp: { level: number; name: string } | null;
  source?: string;
  content?: string;
}

interface PaymentRequest {
  id: string;
  content: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  bank: { name: string; short: string; accountNo: string; accountName: string };
  qrPayload: string;
  result?: TopupResult | null;
}

interface MomoTopupResult {
  amount: number;
  bonus: number;
  balance: number;
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Dòng thông tin tài khoản — nút copy riêng từng dòng */
function InfoRow({
  label,
  value,
  mono,
  highlight,
  copyText,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  copyText?: string;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl ${
      highlight ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30' : 'bg-gray-50 dark:bg-gray-700/50'
    }`}>
      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
      <span className={`flex items-center gap-1.5 min-w-0 ${mono ? 'font-mono' : ''} ${
        highlight ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-semibold text-gray-800 dark:text-white'
      }`}>
        <span className="truncate">{value}</span>
        {copyText && (
          <button
            type="button"
            onClick={() => onCopy(copyText, label.toLowerCase())}
            className={`flex-shrink-0 p-1 rounded-md transition-colors ${
              highlight ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label={`Sao chép ${label}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

/** Modal mã QR VietQR ĐỘNG — mỗi giao dịch 1 nội dung CK duy nhất (NAPxxxxxx).
 *  Poll server mỗi 3s + realtime user:updated → tự phát hiện đã nhận tiền. */
function BankQrModal({
  payment,
  onClose,
  onRetry,
  onPaid,
}: {
  payment: PaymentRequest;
  onClose: () => void;
  onRetry: () => void;
  onPaid: (result: TopupResult) => void;
}) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<'pending' | 'paid' | 'expired'>(payment.status);
  const [result, setResult] = useState<TopupResult | null>(payment.result ?? null);
  // Init bằng TTL (pure) — interval dưới sẽ hiệu chỉnh về giờ thực trong 1 giây đầu
  const [secondsLeft, setSecondsLeft] = useState(payment.expiresAt - payment.createdAt);
  const paidHandled = useRef(false);

  // View hiển thị: pending + hết giờ đếm ngược → expired (derive, không cần setState)
  const view: 'pending' | 'paid' | 'expired' =
    status === 'pending' && secondsLeft <= 0 ? 'expired' : status;

  // Đếm ngược hết hạn
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(payment.expiresAt - Date.now()), 1000);
    return () => clearInterval(t);
  }, [payment.expiresAt]);

  // Poll trạng thái mỗi 3s — phát hiện webhook đã cộng tiền (bước 4→5 của flow)
  useEffect(() => {
    if (status !== 'pending') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api<{ ok: boolean; payment: PaymentRequest }>(`/payments/${payment.id}`);
        if (cancelled) return;
        if (res.payment.status === 'paid' && res.payment.result) {
          setStatus('paid');
          setResult(res.payment.result);
          if (!paidHandled.current) {
            paidHandled.current = true;
            onPaid(res.payment.result);
          }
        } else if (res.payment.status === 'expired') {
          setStatus('expired');
        }
      } catch {
        // Lỗi mạng tạm thời — lần poll sau sẽ thử lại
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id, status]);

  // Hết giờ đếm ngược đã được derive thành `view` ở trên — không cần effect

  const copy = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast({ type: 'success', title: `Đã sao chép ${label}` }))
      .catch(() => showToast({ type: 'error', title: 'Không thể sao chép' }));
  };

  const InfoRowProps = { onCopy: copy };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
      onClick={view === 'pending' ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Thanh toán chuyển khoản VietQR"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-sm overflow-hidden animate-pop-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Landmark className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                Chuyển khoản ngân hàng
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">VietQR động · tự động xác nhận</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {view === 'paid' ? (
            /* ---------- ĐÃ NHẬN TIỀN ---------- */
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pop-in">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4">Đã nhận được chuyển khoản!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Nội dung <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{payment.content}</span> đã được đối soát tự động.
              </p>
              {result && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                    <span className="text-gray-500 dark:text-gray-400">Số tiền nạp</span>
                    <span className="font-bold text-gray-800 dark:text-white">+{formatNumber(result.amount)}đ</span>
                  </div>
                  {result.bonus > 0 && (
                    <div className="flex justify-between px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" /> Thưởng
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">+{formatNumber(result.bonus)}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <span className="text-gray-500 dark:text-gray-400">Số dư mới</span>
                    <span className="font-bold text-gradient">{formatNumber(result.balance)}đ</span>
                  </div>
                </div>
              )}
              <button
                onClick={onClose}
                className="mt-5 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Hoàn tất
              </button>
            </div>
          ) : view === 'expired' ? (
            /* ---------- HẾT HẠN ---------- */
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4">Mã đã hết hạn</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Mã QR sống 15 phút — tạo mã mới để tiếp tục nạp.
              </p>
              <button
                onClick={onRetry}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Tạo mã QR mới
              </button>
            </div>
          ) : (
            /* ---------- ĐANG CHỜ CHUYỂN KHOẢN ---------- */
            <>
              <div className="flex flex-col items-center">
                <div className="bg-white rounded-2xl p-3.5 shadow-md ring-1 ring-gray-100 dark:ring-gray-600 relative">
                  <QRCodeSVG value={payment.qrPayload} size={196} level="M" marginSize={0} />
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-500/20 pointer-events-none" />
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <QrCode className="w-3.5 h-3.5" />
                  Mở app ngân hàng → quét mã (tự điền đủ thông tin)
                </p>
              </div>

              <div className="space-y-2">
                <InfoRow {...InfoRowProps} label="Ngân hàng" value={payment.bank.name} />
                <InfoRow {...InfoRowProps} label="Số tài khoản" value={payment.bank.accountNo} mono copyText={payment.bank.accountNo} />
                <InfoRow {...InfoRowProps} label="Chủ tài khoản" value={payment.bank.accountName} />
                <InfoRow {...InfoRowProps} label="Số tiền" value={`${formatNumber(payment.amount)}đ`} highlight copyText={String(payment.amount)} />
                <InfoRow {...InfoRowProps} label="Nội dung CK" value={payment.content} mono highlight copyText={payment.content} />
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  Đang chờ chuyển khoản…
                </span>
                <span className={`flex items-center gap-1 font-mono font-bold ${
                  secondsLeft < 60000 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {fmtCountdown(secondsLeft)}
                </span>
              </div>

              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500 px-1">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Hệ thống tự động đối soát qua webhook ngân hàng (Casso/SePay) khi tiền về tài khoản
                — chuyển ĐÚNG nội dung để được cộng tiền ngay, không cần gửi bill.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Modal nạp qua ví MoMo — CHỈ mở khi bấm nút "Nạp Xđ" (đã bỏ xem trước inline).
 *  Flow: mở app MoMo → quét QR / chuyển tới số TK → bấm "Tôi đã chuyển khoản" → nhận tiền + thưởng. */
function MomoQrModal({
  amount,
  bonus,
  onConfirm,
  onClose,
}: {
  amount: number;
  bonus: number;
  onConfirm: (amount: number) => Promise<MomoTopupResult | null>;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MomoTopupResult | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast({ type: 'success', title: `Đã sao chép ${label}` }))
      .catch(() => showToast({ type: 'error', title: 'Không thể sao chép' }));
  };
  const InfoRowProps = { onCopy: copy };

  const confirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await onConfirm(amount);
      if (res) setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
      onClick={result ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Nạp tiền qua ví MoMo"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-sm overflow-hidden animate-pop-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={MOMO_LOGO}
              alt="MoMo"
              className="w-9 h-9 rounded-xl object-cover shadow-md bg-white flex-shrink-0"
            />
            <div>
              <h2 className="font-bold text-gray-800 dark:text-white">Ví điện tử MoMo</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quét mã → chuyển tiền → nhận thưởng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {result ? (
            /* ---------- NẠP THÀNH CÔNG ---------- */
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#A50064] to-[#7C0050] rounded-full flex items-center justify-center shadow-xl shadow-pink-500/30 animate-pop-in">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-4">Nạp tiền thành công!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Số dư đã được cộng vào tài khoản của bạn.</p>
              <div className="mt-4 space-y-2 text-sm text-left">
                <div className="flex justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <span className="text-gray-500 dark:text-gray-400">Số tiền nạp</span>
                  <span className="font-bold text-gray-800 dark:text-white">+{formatNumber(result.amount)}đ</span>
                </div>
                {result.bonus > 0 && (
                  <div className="flex justify-between px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" /> Thưởng
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">+{formatNumber(result.bonus)}đ</span>
                  </div>
                )}
                <div className="flex justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <span className="text-gray-500 dark:text-gray-400">Số dư mới</span>
                  <span className="font-bold text-gradient">{formatNumber(result.balance)}đ</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-5 w-full py-3 bg-gradient-to-r from-[#A50064] to-[#7C0050] text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Hoàn tất
              </button>
            </div>
          ) : (
            /* ---------- CHỜ CHUYỂN QUA MOMO ---------- */
            <>
              <div className="flex flex-col items-center">
                <div className="bg-white rounded-2xl p-3.5 shadow-md ring-1 ring-gray-100 dark:ring-gray-600">
                  <img src={momoQr} alt="Mã QR MoMo" className="w-52 h-52 rounded-xl" />
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <QrCode className="w-3.5 h-3.5" />
                  Mở app MoMo → Quét mã để chuyển tiền nhanh
                </p>
              </div>

              <div className="space-y-2">
                <InfoRow {...InfoRowProps} label="Ví điện tử" value="MoMo" />
                <InfoRow {...InfoRowProps} label="Chủ tài khoản" value="NGUYỄN THẾ LƯƠNG" />
                <InfoRow {...InfoRowProps} label="Số tài khoản" value="0368852235" mono copyText="0368852235" />
                <InfoRow {...InfoRowProps} label="Số tiền chuyển" value={`${formatNumber(amount)}đ`} highlight copyText={String(amount)} />
              </div>

              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500 px-1">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Quét mã hoặc chuyển tới số tài khoản trên với ĐÚNG {formatNumber(amount)}đ — sau khi
                chuyển thành công, bấm nút bên dưới để nhận {formatNumber(amount + bonus)}đ
                (gồm thưởng {formatNumber(bonus)}đ) vào số dư.
              </p>

              <button
                onClick={confirm}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl transition-all ${
                  loading
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#A50064] to-[#7C0050] text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-pink-600/30 border-t-pink-600 rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-5 h-5" />
                    Tôi đã chuyển khoản — Nhận tiền
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Để sau
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TopUpPageInner() {
  const { user, addBalance, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<number>(PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState('bank');
  const [processing, setProcessing] = useState(false);
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  /** Modal MoMo CHỈ mở khi bấm Nạp — snapshot số tiền & thưởng tại thời điểm bấm */
  const [momoPay, setMomoPay] = useState<{ amount: number; bonus: number } | null>(null);

  if (!user) return null;

  const amount = custom.trim() ? Math.max(0, parseInt(custom.replace(/\D/g, ''), 10) || 0) : selected;
  const valid = amount >= 10000;
  // Thưởng theo mệnh giá (backend tính lại chuẩn) + ước tính thưởng VIP theo hạng hiện tại
  const baseBonus = amount >= 1000000 ? Math.round(amount * 0.05) : amount >= 500000 ? Math.round(amount * 0.02) : 0;
  const vip = getVipInfo(user.totalTopup ?? 0, user.vipOverride);
  const vipBonus = vip.tier ? Math.round((amount * vip.tier.bonusPct) / 100) : 0;
  const bonus = baseBonus + vipBonus;

  /** Gọi API cộng tiền + toast thành công + reset lựa chọn — dùng chung:
   *  thẻ (nạp trực tiếp) và MoMo (bấm "Tôi đã chuyển khoản" trong modal) */
  const applyTopup = async (value: number, payMethod: string): Promise<MomoTopupResult | null> => {
    if (processing) return null;
    setProcessing(true);
    const res = await addBalance(value, payMethod);
    setProcessing(false);
    if (!res.ok) {
      showToast({ type: 'error', title: 'Nạp tiền thất bại', message: res.error });
      return null;
    }
    showTopUpSuccess(res, value);
    setCustom('');
    setSelected(PRESETS[0]);
    return {
      amount: value,
      bonus: res.bonus ?? 0,
      balance: res.balance ?? user.balance + value,
    };
  };

  /** Thẻ ngân hàng: bấm Nạp → cộng tiền trực tiếp (flow cũ) */
  const handleTopUp = () => {
    if (!valid) return;
    applyTopup(amount, method);
  };

  /** MoMo: modal gọi khi user bấm "Tôi đã chuyển khoản" */
  const confirmMomo = (value: number) => applyTopup(value, 'momo');

  /** Toast thành công dùng chung cho nạp trực tiếp (momo/thẻ) + VietQR webhook */
  const showTopUpSuccess = (
    res: { bonus?: number; vipBonus?: number; balance?: number; tierUp?: { level: number; name: string } | null },
    value: number
  ) => {
    const parts: string[] = [];
    if (res.bonus && res.bonus > 0) parts.push(`gồm thưởng ${formatNumber(res.bonus)}đ`);
    if (res.vipBonus && res.vipBonus > 0) parts.push(`thưởng VIP ${formatNumber(res.vipBonus)}đ`);
    showToast({
      type: 'success',
      title: res.tierUp ? `Lên hạng VIP ${res.tierUp.level} · ${res.tierUp.name}! 👑` : 'Nạp tiền thành công! 🎉',
      message: `+${formatNumber(value + (res.bonus ?? 0))}đ${parts.length ? ' (' + parts.join(', ') + ')' : ''} · Số dư mới: ${formatNumber(res.balance ?? user.balance + value)}đ`,
      duration: 5000,
    });
    if (res.tierUp) {
      setTimeout(() => {
        showToast({
          type: 'success',
          title: `👑 VIP ${res.tierUp!.level} · ${res.tierUp!.name}`,
          message: 'Bạn đã mở khóa quyền lợi hạng mới — xem chi tiết tại Hồ sơ!',
          duration: 6000,
        });
      }, 800);
    }
  };

  /** BƯỚC 1 của flow VietQR: bấm Thanh toán → server sinh QR động (NAPxxxxxx) */
  const startBankPayment = async () => {
    if (!valid || processing) return;
    setProcessing(true);
    try {
      const res = await api<{ ok: boolean; payment: PaymentRequest }>('/payments/create', {
        method: 'POST',
        body: { amount },
      });
      setPayment(res.payment);
    } catch (err) {
      showToast({ type: 'error', title: 'Không tạo được mã thanh toán', message: err instanceof Error ? err.message : 'Thử lại sau' });
    } finally {
      setProcessing(false);
    }
  };

  /** Bước 5: poll/realtime phát hiện tiền vào → toast + đồng bộ số dư */
  const handlePaymentPaid = async (result: TopupResult) => {
    showTopUpSuccess(result, result.amount);
    setCustom('');
    setSelected(PRESETS[0]);
    await refreshUser();
  };

  const handlePayClick = () => {
    if (method === 'bank') startBankPayment();
    else if (method === 'momo') setMomoPay({ amount, bonus });
    else handleTopUp();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <AnimatedSection delay={0}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Nạp số dư</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Số dư hiện tại: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(user.balance)}đ</span>
            </p>
            <p className={`text-xs mt-1 flex items-center gap-1.5 truncate ${vip.tier ? vip.tier.text : 'text-gray-500 dark:text-gray-400'}`}>
              <Crown className={`w-3.5 h-3.5 flex-shrink-0 ${vip.tier ? vip.tier.crown : 'text-gray-400'}`} />
              {vip.tier ? (
                <>
                  VIP {vip.tier.level} · {vip.tier.name} — thưởng nạp +{vip.tier.bonusPct}%
                  {vip.nextTier && <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">· còn {formatNumber(vip.remaining)}đ nữa lên VIP {vip.nextTier.level}</span>}
                </>
              ) : (
                <>
                  Nạp tổng 100.000đ để mở hạng VIP đầu tiên
                </>
              )}
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* Amount selection */}
      <AnimatedSection delay={100}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4">Chọn số tiền nạp</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRESETS.map((p) => {
              const active = !custom && selected === p;
              return (
                <button
                  key={p}
                  onClick={() => {
                    setSelected(p);
                    setCustom('');
                  }}
                  className={`relative py-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400 hover:scale-[1.01]'
                  }`}
                >
                  {formatNumber(p)}đ
                  {p === 1000000 && (
                    <span className="absolute -top-2 -right-2 flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                      <Sparkles className="w-2.5 h-2.5" /> +5%
                    </span>
                  )}
                  {p === 500000 && (
                    <span className="absolute -top-2 -right-2 flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                      <Sparkles className="w-2.5 h-2.5" /> +2%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
              Hoặc nhập số tiền khác (tối thiểu 10.000đ)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
              placeholder="Nhập số tiền..."
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </AnimatedSection>

      {/* Payment method */}
      <AnimatedSection delay={200}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4">Phương thức thanh toán</h2>
          <div className="space-y-2.5">
            {METHODS.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`w-full flex items-center gap-3.5 p-4 rounded-xl border-2 text-left transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {m.img ? (
                    <img
                      src={m.img}
                      alt={m.label}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-md bg-white"
                    />
                  ) : (
                    <div className={`w-10 h-10 bg-gradient-to-br ${m.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <m.icon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{m.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.sub}</p>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-gray-500'
                    }`}
                  >
                    {active && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* Summary */}
      <AnimatedSection delay={300}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Số tiền nạp</span>
              <span className="font-semibold text-gray-800 dark:text-white">{formatNumber(amount)}đ</span>
            </div>
            {baseBonus > 0 && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" /> Thưởng nạp tiền
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">+{formatNumber(baseBonus)}đ</span>
              </div>
            )}
            {vipBonus > 0 && vip.tier && (
              <div className="flex justify-between">
                <span className={`flex items-center gap-1 ${vip.tier.crown}`}>
                  <Crown className="w-3.5 h-3.5" /> Thưởng VIP {vip.tier.level} · {vip.tier.name} (+{vip.tier.bonusPct}%)
                </span>
                <span className={`font-semibold ${vip.tier.crown}`}>+{formatNumber(vipBonus)}đ</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Phí giao dịch</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Miễn phí</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-800 dark:text-white">Nhận về tài khoản</span>
              <span className="text-xl font-bold text-gradient">{formatNumber(amount + bonus)}đ</span>
            </div>
          </div>

          <button
            onClick={handlePayClick}
            disabled={!valid || processing}
            className={`mt-5 w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl transition-all ${
              valid && !processing
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {processing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : method === 'bank' ? (
              <>
                <QrCode className="w-5 h-5" />
                Thanh toán {formatNumber(amount)}đ
              </>
            ) : (
              <>
                <BadgeCheck className="w-5 h-5" />
                Nạp {formatNumber(amount)}đ
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            {method === 'bank'
              ? 'Số tiền được cộng tự động khi hệ thống nhận được chuyển khoản'
              : method === 'momo'
                ? 'Mã QR MoMo sẽ hiện ở bước tiếp theo · Chuyển tiền xong bấm xác nhận để nhận tiền'
                : 'Số dư sẽ được cộng ngay sau khi nạp · Bảo mật 100%'}
          </p>
        </div>
      </AnimatedSection>

      {/* Modal MoMo — CHỈ mở khi bấm nút Nạp (đã bỏ xem trước inline + lightbox cũ) */}
      {momoPay && (
        <MomoQrModal
          amount={momoPay.amount}
          bonus={momoPay.bonus}
          onConfirm={confirmMomo}
          onClose={() => setMomoPay(null)}
        />
      )}

      {/* Modal VietQR động — flow đủ 5 bước: tạo QR → quét → webhook → cộng tiền → UI tự cập nhật */}
      {payment && (
        <BankQrModal
          payment={payment}
          onClose={() => setPayment(null)}
          onRetry={() => {
            setPayment(null);
            startBankPayment();
          }}
          onPaid={handlePaymentPaid}
        />
      )}
    </div>
  );
}

export default function TopUpPage() {
  return <TopUpPageInner />;
}
