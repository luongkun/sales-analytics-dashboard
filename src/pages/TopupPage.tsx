import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Check, CirclePlus, CreditCard, Landmark, Loader2, QrCode, ShieldCheck, Wallet, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { InfoRow } from '../components/InfoRow';
import { api, errMessage } from '../lib/api';
import { formatVND, formatCountdown } from '../lib/formatters';
import { VIP_TIERS } from '../data/static';
import type { PublicPayment } from '../lib/types';
import momoImg from '../assets/momo.jpg';

type Method = 'bank' | 'card' | 'momo';

export function TopupPage() {
  const { user, addBalance, refreshUser } = useAuth();
  const toast = useToast();
  const [amount, setAmount] = useState<number>(50000);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState<Method>('bank');
  const [creating, setCreating] = useState(false);
  const [payment, setPayment] = useState<PublicPayment | null>(null);

  const tier = user?.vip;
  const bonusPct = tier?.bonusPct ?? 0;
  const vipBonus = Math.floor((amount * bonusPct) / 100);
  const baseBonus = Math.floor(amount * 0.1);
  const levelBonus = amount >= 1_000_000 ? Math.floor(amount * 0.05) : amount >= 500_000 ? Math.floor(amount * 0.02) : 0;
  const receive = amount + vipBonus + levelBonus;

  const quick = [50000, 100000, 200000, 500000, 1000000, 2000000];

  const onCustom = (v: string) => {
    setCustom(v);
    const digits = v.replace(/\D/g, '');
    if (digits) {
      const n = parseInt(digits, 10);
      if (n >= 10000 && n <= 50_000_000) setAmount(n);
    }
  };

  const doTopup = async () => {
    if (amount < 10000) {
      toast.showToast({ type: 'warning', title: 'Số tiền nạp tối thiểu 10.000đ' });
      return;
    }
    if (method === 'bank') {
      setCreating(true);
      try {
        const d = await api<{ payment: PublicPayment }>('/payments/create', { method: 'POST', body: { amount } });
        setPayment(d.payment);
      } catch (e) {
        toast.showToast({ type: 'error', title: 'Không tạo được mã thanh toán', message: errMessage(e) });
      } finally {
        setCreating(false);
      }
      return;
    }
    if (method === 'card') {
      const res = await addBalance(amount, 'card');
      if (res) showTopupSuccess(res);
      return;
    }
    // momo: mở modal tự xử lý
    setMomoOpen({ amount, bonus: vipBonus + levelBonus });
  };

  const showTopupSuccess = (res: Record<string, any>) => {
    const bonus = (res.bonus ?? 0) + (res.vipBonus ?? 0);
    toast.showToast({
      type: 'success',
      title: res.tierUp ? `Lên hạng VIP ${res.tierUp.level} · ${res.tierUp.name}! 👑` : 'Nạp tiền thành công! 🎉',
      message: `+${formatVND(amount + bonus)}đ (gồm thưởng ${formatVND(res.bonus ?? 0)}đ, thưởng VIP ${formatVND(res.vipBonus ?? 0)}đ) · Số dư mới: ${formatVND(res.balance ?? 0)}đ`,
      duration: 6000,
    });
    if (res.tierUp) {
      setTimeout(() => {
        toast.showToast({
          type: 'info',
          title: `👑 VIP ${res.tierUp.level} · ${res.tierUp.name}`,
          message: 'Bạn đã mở khóa quyền lợi hạng mới — xem chi tiết tại Hồ sơ!',
          duration: 6000,
        });
      }, 800);
    }
    refreshUser();
  };

  const [momoOpen, setMomoOpen] = useState<{ amount: number; bonus: number } | null>(null);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nạp số dư</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Số dư hiện tại: {formatVND(user.balance)}đ</p>
        </div>
        {tier && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/15 to-fuchsia-500/10 text-purple-600 dark:text-purple-300 border border-purple-200/50 dark:border-purple-500/30">
            👑 VIP {tier.level} · {tier.name} — thưởng nạp +{tier.bonusPct}%
          </span>
        )}
      </div>

      {/* Chọn số tiền */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Chọn số tiền nạp</h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {quick.map((q) => (
            <button
              key={q}
              onClick={() => {
                setAmount(q);
                setCustom('');
              }}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                amount === q && !custom
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {formatVND(q)}đ{q >= 1_000_000 ? ' (+5%)' : q === 500_000 ? ' (+2%)' : ''}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-xs text-gray-400">Hoặc nhập số tiền khác (tối thiểu 10.000đ)</label>
          <input
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            inputMode="numeric"
            placeholder="Nhập số tiền..."
            className="mt-1 w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 transition-colors"
          />
        </div>
      </div>

      {/* Phương thức */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Phương thức thanh toán</h3>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MethodCard active={method === 'bank'} onClick={() => setMethod('bank')} gradient="from-blue-500 to-indigo-600" icon={<Landmark size={20} />} title="Chuyển khoản ngân hàng" sub="VietQR động · tự động cộng tiền" />
          <MethodCard active={method === 'card'} onClick={() => setMethod('card')} gradient="from-purple-500 to-fuchsia-600" icon={<CreditCard size={20} />} title="Thẻ ngân hàng" sub="Visa · Mastercard" />
          <MethodCard active={method === 'momo'} onClick={() => setMethod('momo')} gradient="from-[#A50064] to-[#7C0050]" icon={<img src={momoImg} alt="MoMo" className="w-5 h-5 rounded object-cover" />} title="Ví điện tử MoMo" sub="Quét mã QR · nhận tiền ngay" />
        </div>
      </div>

      {/* Tóm tắt */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Tóm tắt</h3>
        <Row label={`Số tiền nạp`} value={`${formatVND(amount)}đ`} />
        <Row label={`Thưởng VIP ${tier ? `${tier.level} · ${tier.name} (+${bonusPct}%)` : ''}`} value={`+${formatVND(vipBonus + levelBonus)}đ`} highlight />
        <Row label="Phí giao dịch" value="Miễn phí" />
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Nhận về tài khoản</span>
          <span className="text-xl font-bold text-gradient">{formatVND(receive)}đ</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={doTopup}
          disabled={creating}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {creating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Đang tạo mã thanh toán...
            </>
          ) : (
            <>
              {method === 'bank' && <QrCode size={18} />} Thanh toán {formatVND(amount)}đ
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center">
          {method === 'bank' && 'Số tiền được cộng tự động khi hệ thống nhận được chuyển khoản'}
          {method === 'momo' && 'Mã QR MoMo sẽ hiện ở bước tiếp theo · Chuyển tiền xong bấm xác nhận để nhận tiền'}
          {method === 'card' && 'Số dư sẽ được cộng ngay sau khi nạp · Bảo mật 100%'}
        </p>
      </div>

      {payment && (
        <BankQrModal
          payment={payment}
          onClose={() => setPayment(null)}
          onPaid={(p, result) => {
            setPayment(null);
            showTopupSuccess(result);
          }}
        />
      )}
      {momoOpen && (
        <MomoQrModal
          amount={momoOpen.amount}
          bonus={momoOpen.bonus}
          onClose={() => setMomoOpen(null)}
          onConfirm={async () => {
            const res = await addBalance(momoOpen.amount, 'momo');
            if (res) showTopupSuccess(res);
            return !!res;
          }}
        />
      )}
    </div>
  );
}

function MethodCard({ active, onClick, gradient, icon, title, sub }: { active: boolean; onClick: () => void; gradient: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 text-left transition-all ${active ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>{icon}</div>
      <p className="mt-2.5 text-sm font-bold text-gray-900 dark:text-gray-100">{title}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </button>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'}`}>{value}</span>
    </div>
  );
}

/* ================= BANK QR MODAL ================= */

function BankQrModal({ payment, onClose, onPaid }: { payment: PublicPayment; onClose: () => void; onPaid: (p: PublicPayment, result: Record<string, any>) => void }) {
  const [current, setCurrent] = useState<PublicPayment>(payment);
  const [countdown, setCountdown] = useState(payment.expiresAt - Date.now());
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToast();

  // Poll 3s
  useEffect(() => {
    if (current.status !== 'pending') return;
    pollRef.current = setInterval(async () => {
      try {
        const d = await api<{ payment: PublicPayment }>(`/payments/${current.id}`);
        if (d.payment.status === 'paid') {
          clearInterval(pollRef.current!);
          setPaid(true);
          setCurrent(d.payment);
          if (d.payment.result) onPaid(d.payment, d.payment.result as any);
        } else if (d.payment.status === 'expired') {
          clearInterval(pollRef.current!);
          setExpired(true);
        }
      } catch {
        /* silent */
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [current.id, current.status, onPaid]);

  useEffect(() => {
    if (paid || expired) return;
    const t = setInterval(() => {
      const left = current.expiresAt - Date.now();
      setCountdown(left);
      if (left <= 0) setExpired(true);
    }, 1000);
    return () => clearInterval(t);
  }, [current.expiresAt, paid, expired]);

  const renew = async () => {
    setRenewing(true);
    try {
      const d = await api<{ payment: PublicPayment }>('/payments/create', { method: 'POST', body: { amount: current.amount } });
      setCurrent(d.payment);
      setExpired(false);
      setPaid(false);
      setCountdown(d.payment.expiresAt - Date.now());
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Không tạo được mã QR mới', message: errMessage(e) });
    } finally {
      setRenewing(false);
    }
  };

  const result = current.result;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
      <div className="max-w-sm w-full rounded-2xl shadow-2xl bg-white dark:bg-gray-800 overflow-hidden animate-pop-in max-h-[92vh] flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Landmark size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Chuyển khoản ngân hàng</h3>
            <p className="text-[11px] text-gray-400">VietQR động · tự động xác nhận</p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-5 space-y-4">
          {paid && result ? (
            <>
              <div className="flex flex-col items-center py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pop-in">
                  <Check size={30} className="text-white" />
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">Đã nhận được chuyển khoản!</h3>
              </div>
              <div className="space-y-2">
                <InfoRow label="Số tiền nạp" value={`+${formatVND(current.amount)}đ`} />
                <InfoRow label="Thưởng" value={`+${formatVND((result.bonus ?? 0) + (result.vipBonus ?? 0))}đ`} />
                <InfoRow label="Số dư mới" value={`${formatVND(result.balance ?? 0)}đ`} highlight />
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30">
                Hoàn tất
              </button>
            </>
          ) : expired ? (
            <>
              <div className="flex flex-col items-center py-6">
                <span className="text-4xl">⏰</span>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">Mã QR đã hết hạn</h3>
                <p className="mt-1 text-xs text-gray-400">Vui lòng tạo mã QR mới để tiếp tục</p>
              </div>
              <button
                onClick={renew}
                disabled={renewing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {renewing ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />} Tạo mã QR mới
              </button>
            </>
          ) : (
            <>
              {/* QR */}
              <div className="flex justify-center">
                <div className="bg-white rounded-2xl p-3.5 shadow-md ring-1 ring-gray-200">
                  <QRCodeSVG value={current.qrPayload} size={196} level="M" marginSize={0} />
                </div>
              </div>
              <p className="text-center text-xs text-gray-400">Mở app ngân hàng → quét mã (tự điền đủ thông tin)</p>

              <div className="space-y-2">
                <InfoRow label="Ngân hàng" value={current.bank.name} />
                <InfoRow label="Số tài khoản" value={current.bank.accountNo} copy={current.bank.accountNo} copyLabel="số tài khoản" />
                <InfoRow label="Chủ tài khoản" value={current.bank.accountName} />
                <InfoRow label="Số tiền" value={`${formatVND(current.amount)}đ`} copy={String(current.amount)} copyLabel="số tiền" highlight />
                <InfoRow label="Nội dung CK" value={current.content} copy={current.content} copyLabel="nội dung" highlight />
              </div>

              {/* Status + countdown */}
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10">
                <Loader2 size={15} className="text-amber-500 animate-spin" />
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Đang chờ chuyển khoản…</span>
                <span className="ml-auto text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{formatCountdown(countdown)}</span>
              </div>

              <div className="flex gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <ShieldCheck size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                  Hệ thống tự động đối soát qua webhook ngân hàng (Casso/SePay) khi tiền về tài khoản — chuyển ĐÚNG nội dung để được cộng tiền ngay, không cần gửi bill.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ================= MOMO QR MODAL ================= */

function MomoQrModal({ amount, bonus, onClose, onConfirm }: { amount: number; bonus: number; onClose: () => void; onConfirm: () => Promise<boolean> }) {
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const toast = useToast();

  const confirm = async () => {
    setProcessing(true);
    const ok = await onConfirm();
    setProcessing(false);
    if (ok) setPaid(true);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
      <div className="max-w-sm w-full rounded-2xl shadow-2xl bg-white dark:bg-gray-800 overflow-hidden animate-pop-in max-h-[92vh] flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A50064] to-[#7C0050] flex items-center justify-center overflow-hidden shadow-lg">
            <img src={momoImg} alt="MoMo" className="w-6 h-6 rounded object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Ví điện tử MoMo</h3>
            <p className="text-[11px] text-gray-400">Quét mã → chuyển tiền → nhận thưởng</p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-5 space-y-4">
          {paid ? (
            <>
              <div className="flex flex-col items-center py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#A50064] to-[#7C0050] flex items-center justify-center animate-pop-in">
                  <Check size={30} className="text-white" />
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">Nạp tiền thành công!</h3>
                <p className="mt-1 text-xs text-gray-400">Số dư đã được cộng vào tài khoản của bạn.</p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#A50064] to-[#7C0050] text-white font-bold text-sm shadow-lg">
                Hoàn tất
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <img src={momoImg} alt="Mã QR MoMo" className="w-52 h-52 rounded-xl object-cover ring-1 ring-gray-200 shadow-md" />
              </div>
              <p className="text-center text-xs text-gray-400">Mở app MoMo → Quét mã để chuyển tiền nhanh</p>
              <div className="space-y-2">
                <InfoRow label="Ví điện tử" value="MoMo" />
                <InfoRow label="Chủ tài khoản" value="NGUYỄN THẾ LƯƠNG" />
                <InfoRow label="Số tài khoản" value="0368852235" copy="0368852235" copyLabel="số tài khoản" />
                <InfoRow label="Số tiền" value={`${formatVND(amount)}đ`} copy={String(amount)} copyLabel="số tiền" highlight />
              </div>
              <div className="flex gap-2 p-3 rounded-xl bg-pink-500/5">
                <ShieldCheck size={15} className="text-[#A50064] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                  Quét mã hoặc chuyển tới số tài khoản trên với ĐÚNG {formatVND(amount)}đ — sau khi chuyển thành công, bấm nút bên dưới để nhận{' '}
                  <b>{formatVND(amount + bonus)}đ</b> (gồm thưởng <b>{formatVND(bonus)}đ</b>) vào số dư.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={confirm}
                  disabled={processing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#A50064] to-[#7C0050] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    'Tôi đã chuyển khoản — Nhận tiền'
                  )}
                </button>
                <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors py-1">
                  Để sau
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
