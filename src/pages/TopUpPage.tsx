import { useState, ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Banknote, CreditCard, Sparkles, BadgeCheck, ZoomIn, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNumber } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';
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
  { id: 'bank', label: 'Chuyển khoản ngân hàng', sub: 'VietQR · Miễn phí', icon: Banknote, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'card', label: 'Thẻ ngân hàng', sub: 'Visa · Mastercard', icon: CreditCard, gradient: 'from-purple-500 to-fuchsia-600' },
  { id: 'momo', label: 'Ví điện tử MoMo', sub: 'Cộng tiền ngay lập tức', icon: Banknote, gradient: 'from-[#A50064] to-[#7C0050]', img: MOMO_LOGO },
];

function TopUpPageInner() {
  const { user, addBalance } = useAuth();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<number>(PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState('bank');
  const [processing, setProcessing] = useState(false);
  const [qrZoom, setQrZoom] = useState(false);

  if (!user) return null;

  const amount = custom.trim() ? Math.max(0, parseInt(custom.replace(/\D/g, ''), 10) || 0) : selected;
  const valid = amount >= 10000;
  const bonus = amount >= 1000000 ? Math.round(amount * 0.05) : amount >= 500000 ? Math.round(amount * 0.02) : 0;

  const handleTopUp = async () => {
    if (!valid || processing) return;
    setProcessing(true);
    const res = await addBalance(amount, method);
    setProcessing(false);
    if (res.ok) {
      showToast({
        type: 'success',
        title: 'Nạp tiền thành công! 🎉',
        message: bonus > 0 ? `+${formatNumber(amount + bonus)}đ (gồm thưởng ${formatNumber(bonus)}đ)` : `+${formatNumber(amount)}đ · Số dư mới: ${formatNumber(res.balance ?? user.balance + amount)}đ`,
        duration: 4000,
      });
      setCustom('');
      setSelected(PRESETS[0]);
    } else {
      showToast({ type: 'error', title: 'Nạp tiền thất bại', message: res.error });
    }
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
          {method === 'momo' && (
            <div className="flex flex-col sm:flex-row items-center gap-5 mb-6 p-4 rounded-xl border border-pink-200 dark:border-pink-500/20 bg-pink-50/50 dark:bg-pink-500/5">
              <button
                onClick={() => setQrZoom(true)}
                className="relative group/qr flex-shrink-0 cursor-zoom-in"
                aria-label="Phóng to mã QR"
                title="Bấm để phóng to"
              >
                <img
                  src={momoQr}
                  alt="QR MoMo"
                  className="w-40 h-40 rounded-xl border-4 border-white dark:border-gray-700 shadow-lg transition-transform duration-200 group-hover/qr:scale-[1.03]"
                />
                <span className="absolute inset-0 rounded-xl bg-black/0 group-hover/qr:bg-black/30 flex items-center justify-center transition-colors">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover/qr:opacity-100 transition-opacity" />
                </span>
              </button>
              <div className="space-y-2 text-sm min-w-0 text-center sm:text-left">
                <p className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-pink-600 dark:text-pink-400">
                  <Wallet className="w-4 h-4" /> Quét QR MoMo để nạp
                </p>
                <div className="flex justify-between gap-3 sm:justify-start">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Ngân hàng:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">MoMo</span>
                </div>
                <div className="flex justify-between gap-3 sm:justify-start">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Chủ tài khoản:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">NGUYỄN THẾ LƯƠNG</span>
                </div>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <span className="text-gray-500 dark:text-gray-400">Số tài khoản:</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-white">0368852235</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('0368852235').then(() => {
                        showToast({ type: 'success', title: 'Đã sao chép số tài khoản' });
                      });
                    }}
                    className="text-xs text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    Sao chép
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Mở app MoMo → quét mã → chuyển đúng số tiền → bấm nút bên dưới
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Số tiền nạp</span>
              <span className="font-semibold text-gray-800 dark:text-white">{formatNumber(amount)}đ</span>
            </div>
            {bonus > 0 && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" /> Thưởng nạp tiền
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">+{formatNumber(bonus)}đ</span>
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
            onClick={handleTopUp}
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
            ) : (
              <>
                <BadgeCheck className="w-5 h-5" />
                Nạp {formatNumber(amount)}đ
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            Số dư sẽ được cộng ngay sau khi nạp · Bảo mật 100%
          </p>
        </div>
      </AnimatedSection>

      {/* QR Zoom lightbox */}
      {qrZoom &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setQrZoom(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Mã QR phóng to"
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-sm overflow-hidden animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-[#A50064] to-[#7C0050] rounded-xl flex items-center justify-center shadow-md shadow-pink-500/30">
                    <Wallet className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800 dark:text-white">Quét QR MoMo</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mở app MoMo → Quét mã</p>
                  </div>
                </div>
                <button
                  onClick={() => setQrZoom(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col items-center">
                <img
                  src={momoQr}
                  alt="QR MoMo phóng to"
                  className="w-72 h-72 rounded-xl border border-gray-100 dark:border-gray-600 shadow-md"
                />
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  Số tiền: <span className="font-bold text-gradient">{formatNumber(amount + bonus)}đ</span>
                </p>
              </div>

              <div className="px-5 pb-5 space-y-2 text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Ngân hàng</span>
                  <span className="font-semibold text-gray-800 dark:text-white">MoMo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Chủ tài khoản</span>
                  <span className="font-semibold text-gray-800 dark:text-white">NGUYỄN THẾ LƯƠNG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Số tài khoản</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-white">0368852235</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function TopUpPage() {
  return <TopUpPageInner />;
}
