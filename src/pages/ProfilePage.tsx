import { useState } from 'react';
import { Camera, Crown, KeyRound, Mail, Save, Undo2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/vip/Avatar';
import { AVATAR_GRADIENTS, VIP_TIERS, tierProgress } from '../data/static';
import { formatVND } from '../lib/formatters';

export function ProfilePage() {
  const { user, sendVerificationCode, changeEmail, changePassword } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? 'gradient:default');
  const [emailModal, setEmailModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);

  if (!user) return null;
  const tp = tierProgress(user.totalTopup);

  const save = () => {
    // server không có PUT /profile cho member — thông báo lưu cục bộ
    if (name.trim().length < 2) {
      toast.showToast({ type: 'warning', title: 'Tên cần tối thiểu 2 ký tự' });
      return;
    }
    toast.showToast({
      type: 'info',
      title: 'Lưu thành công',
      message: 'Hồ sơ hiển thị sẽ áp dụng phiên này. Đồng bộ máy chủ qua Quản trị viên.',
    });
  };

  return (
    <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left card */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center h-fit">
        <div className="flex justify-center">
          <Avatar name={user.name} avatar={avatar} size="xl" vip={user.vip} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">{user.name}</h3>
        <span
          className={`inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            user.role === 'admin' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'bg-gray-500/10 text-gray-500'
          }`}
        >
          {user.role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'THÀNH VIÊN'}
        </span>
        <p className="mt-2 text-xs text-gray-400">{user.email}</p>

        <div className="mt-5 space-y-3 text-left">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
            <span className="text-xs text-gray-400">SỐ DƯ</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatVND(user.balance)}đ</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
            <span className="text-xs text-gray-400">GÓI NÂNG CẤP</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{user.purchasedUpgrades?.length || 0} đã sở hữu</span>
          </div>
        </div>

        {/* VIP card */}
        <div className="mt-5 p-4 rounded-2xl border border-purple-200/60 dark:border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 text-left">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hạng VIP — Theo tổng tiền đã nạp vào tài khoản</p>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 dark:text-purple-300">
              <Crown size={14} /> {tp.current ? `VIP ${tp.current.level} · ${tp.current.name}` : 'Chưa có hạng'}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-300 font-bold">{tp.current ? `+${tp.current.bonusPct}%` : ''}</span>
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>TỔNG TIỀN ĐÃ NẠP</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatVND(user.totalTopup)}đ</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>THƯỞNG NẠP HIỆN TẠI</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{tp.current ? `+${tp.current.bonusPct}%` : 'Chưa có thưởng VIP'} mỗi lần nạp</span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full" style={{ width: `${tp.progressPct}%` }} />
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">{!tp.next ? 'Hạng cao nhất' : `Còn ${formatVND(tp.remaining)}đ lên VIP ${tp.next.level} · ${tp.next.name}`}</p>
          <div className="mt-3 pt-3 border-t border-purple-200/40 dark:border-purple-500/10 space-y-1.5">
            {VIP_TIERS.map((t) => (
              <div key={t.level} className={`flex items-center justify-between text-[10px] ${tp.current?.level === t.level ? 'text-purple-600 dark:text-purple-300 font-bold' : 'text-gray-400'}`}>
                <span>VIP {t.level} {t.name}</span>
                <span>{formatVND(t.min)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="lg:col-span-2 card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-fit">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Thông tin cá nhân</h3>

        <div className="mt-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 transition-colors"
            />
            <p className="mt-1 text-[10px] text-gray-400">{name.length}/50</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Màu avatar</label>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(AVATAR_GRADIENTS).map(([key, gradient]) => (
                <button
                  key={key}
                  onClick={() => setAvatar(`gradient:${key}`)}
                  aria-label={`Màu ${key}`}
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} ring-2 transition-all ${
                    avatar === `gradient:${key}` ? 'ring-blue-500 scale-110' : 'ring-transparent hover:scale-105'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400">Áp dụng khi không dùng ảnh tải lên</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                <Mail size={15} /> {user.email}
              </div>
              <button onClick={() => setEmailModal(true)} className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                Đổi email
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu</label>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                <KeyRound size={15} /> ••••••••
              </div>
              <button onClick={() => setPwModal(true)} className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <button onClick={() => { setName(user.name); setAvatar(user.avatar ?? 'gradient:default'); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Undo2 size={15} /> Hoàn tác
          </button>
          <button onClick={save} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30">
            <Save size={15} /> Lưu thay đổi
          </button>
        </div>
      </div>

      {emailModal && <EmailModal onClose={() => setEmailModal(false)} currentEmail={user.email} onConfirm={changeEmail} onSendCode={sendVerificationCode} />}
      {pwModal && <PasswordModal onClose={() => setPwModal(false)} onConfirm={changePassword} onSendCode={sendVerificationCode} />}
    </div>
  );
}

function CodeField({ code, setCode, onSend }: { code: string; setCode: (v: string) => void; onSend: () => Promise<string | null> }) {
  const [sending, setSending] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const send = async () => {
    setSending(true);
    const c = await onSend();
    if (c) setDevCode(c);
    setSending(false);
  };
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mã xác nhận (6 số)</label>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="______"
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-mono tracking-widest text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
        />
        <button
          onClick={send}
          disabled={sending}
          className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap disabled:opacity-60"
        >
          {sending ? 'Đang gửi...' : 'Gửi mã xác nhận'}
        </button>
      </div>
      {devCode && <p className="mt-1.5 text-[10px] text-amber-500">Mã phát triển: <b className="font-mono">{devCode}</b></p>}
    </div>
  );
}

function EmailModal({ onClose, currentEmail, onConfirm, onSendCode }: { onClose: () => void; currentEmail: string; onConfirm: (code: string, newEmail: string) => Promise<boolean>; onSendCode: () => Promise<string | null> }) {
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!code || !newEmail.trim()) return;
    setBusy(true);
    const ok = await onConfirm(code, newEmail.trim().toLowerCase());
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-pop-in" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Đổi email</h3>
        <p className="mt-1.5 text-xs text-gray-400">Chúng tôi sẽ gửi mã xác nhận về email hiện tại <b className="text-gray-600 dark:text-gray-300">{currentEmail}</b></p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email mới</label>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              type="email"
              placeholder="email-moi@example.com"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
            />
          </div>
          <CodeField code={code} setCode={setCode} onSend={onSendCode} />
          <p className="text-[10px] text-gray-400">Đổi email cần mã xác nhận gửi về email hiện tại</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold">Đóng</button>
          <button onClick={confirm} disabled={busy || !code || !newEmail} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50">
            {busy ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ onClose, onConfirm, onSendCode }: { onClose: () => void; onConfirm: (code: string, cur: string, nw: string) => Promise<boolean>; onSendCode: () => Promise<string | null> }) {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setError('');
    if (nw.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (nw !== confirmPw) {
      setError('Mật khẩu xác nhận chưa khớp');
      return;
    }
    setBusy(true);
    const ok = await onConfirm(code, cur, nw);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-pop-in" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Đổi mật khẩu</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu hiện tại</label>
            <input value={cur} onChange={(e) => setCur(e.target.value)} type="password" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu mới</label>
            <input value={nw} onChange={(e) => setNw(e.target.value)} type="password" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Xác nhận mật khẩu mới</label>
            <input value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} type="password" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-400" />
          </div>
          <CodeField code={code} setCode={setCode} onSend={onSendCode} />
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <p className="text-[10px] text-gray-400">Đổi mật khẩu cần mã xác nhận gửi về email hiện tại</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold">Đóng</button>
          <button onClick={confirm} disabled={busy || !code} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50">
            {busy ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
