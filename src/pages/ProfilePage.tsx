import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Lock, BadgeCheck, ShieldCheck, Wallet, Rocket, Mail, Send, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAuth, User } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNumber } from '../data/salesData';
import Avatar, { AVATAR_GRADIENTS } from '../components/Avatar';
import AnimatedSection from '../components/AnimatedSection';

function ProfilePageInner() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [saving, setSaving] = useState(false);
  const [securityMode, setSecurityMode] = useState<'none' | 'email' | 'password'>('none');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const dirty = name.trim() !== user.name || (avatar ?? undefined) !== user.avatar;

  const handleAvatarFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', title: 'Chỉ chấp nhận file ảnh' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast({ type: 'error', title: 'Ảnh quá lớn (tối đa 2MB)' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const valid = name.trim().length >= 2 && name.trim().length <= 50;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const res = await updateProfile({ name, avatar: avatar ?? undefined });
    setSaving(false);
    if (res.ok) {
      showToast({ type: 'success', title: 'Đã cập nhật hồ sơ', message: 'Thông tin của bạn đã được lưu.' });
    } else {
      showToast({ type: 'error', title: 'Cập nhật thất bại', message: res.error });
    }
  };

  const previewUser: User = { ...user, name: name.trim() || user.name, avatar: avatar ?? undefined };
  const isPro = user.purchasedUpgrades?.includes('UP-01') ?? false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile card */}
      <AnimatedSection delay={0}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 30%, white 1px, transparent 1px)', backgroundSize: '40px 40px, 60px 60px' }} />
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-5">
              <div className="relative group/avatar">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="relative block rounded-full cursor-pointer"
                  aria-label="Đổi ảnh đại diện"
                  title="Bấm để đổi ảnh đại diện"
                >
                  <Avatar user={previewUser} size="xl" />
                  <span className="absolute inset-0 rounded-full bg-black/0 group-hover/avatar:bg-black/40 flex items-center justify-center transition-colors">
                    <Camera className="w-7 h-7 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                />
              </div>
              <div className="flex-1 min-w-0 sm:pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white truncate">{previewUser.name}</h1>
                  {isPro && (
                    <span
                      className="pro-badge flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white shadow-md shadow-purple-500/40"
                      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #4a1d96 50%, #7c3aed 100%)' }}
                    >
                      pro
                    </span>
                  )}
                  {user.role === 'admin' && (
                    <span className="flex items-center gap-1 flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      <ShieldCheck className="w-3 h-3" /> Quản trị viên
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user.email}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-400/10 dark:to-teal-400/5 px-4 py-3">
                <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Số dư</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(user.balance)}đ</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-purple-100 dark:border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 dark:from-purple-400/10 dark:to-fuchsia-400/5 px-4 py-3">
                <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Gói nâng cấp</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{user.purchasedUpgrades?.length ?? 0} đã sở hữu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Edit form */}
      <AnimatedSection delay={100}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-bold text-gray-800 dark:text-white mb-5">Thông tin cá nhân</h2>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tên hiển thị</label>
                <span className={`text-[10px] ${name.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>{name.length}/50</span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập tên của bạn"
              />
              {name.trim().length > 0 && name.trim().length < 2 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Tên cần tối thiểu 2 ký tự</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Màu avatar</p>
              <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(AVATAR_GRADIENTS).map(([key, gradient]) => (
                  <button
                    key={key}
                    onClick={() => setAvatar(`gradient:${key}`)}
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} transition-all hover:scale-110 ${
                      avatar === `gradient:${key}`
                        ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                        : 'ring-1 ring-gray-200 dark:ring-gray-600'
                    }`}
                    aria-label={`Avatar màu ${key}`}
                    title={key}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                Áp dụng khi không dùng ảnh tải lên
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Email</label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 text-sm rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  onClick={() => setSecurityMode('email')}
                  className="flex-shrink-0 px-4 py-2 text-sm font-bold rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                >
                  Đổi email
                </button>
              </div>
              <p className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                <ShieldCheck className="w-3 h-3" />
                Đổi email cần mã xác nhận gửi về email hiện tại
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Mật khẩu</label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 text-sm rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="tracking-[0.3em]">••••••••</span>
                </div>
                <button
                  onClick={() => setSecurityMode('password')}
                  className="flex-shrink-0 px-4 py-2 text-sm font-bold rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                >
                  Đổi mật khẩu
                </button>
              </div>
              <p className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                <ShieldCheck className="w-3 h-3" />
                Đổi mật khẩu cần mã xác nhận gửi về email hiện tại
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => {
                setName(user.name);
                setAvatar(user.avatar ?? null);
              }}
              disabled={!dirty}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                dirty
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Hoàn tác
            </button>
            <button
              onClick={handleSave}
              disabled={!valid || saving || !dirty}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
                valid && dirty
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <BadgeCheck className="w-4 h-4" />
              Lưu thay đổi
            </button>
          </div>
        </div>
      </AnimatedSection>

      {/* Security modal */}
      {securityMode !== 'none' && (
        <SecurityModal
          mode={securityMode}
          onClose={() => setSecurityMode('none')}
        />
      )}
    </div>
  );
}

function SecurityModal({ mode, onClose }: { mode: 'email' | 'password'; onClose: () => void }) {
  const { user, sendVerificationCode, changeEmail, changePassword } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSendCode = async () => {
    const res = await sendVerificationCode();
    if (res.ok) {
      setStep('verify');
      if (res.demo && res.devCode) {
        showToast({
          type: 'warning',
          title: 'Chưa cấu hình SMTP',
          message: `Mã phát triển: ${res.devCode} (hết hạn sau 5 phút)`,
          duration: 10000,
        });
      } else if (res.ok) {
        showToast({ type: 'success', title: 'Mã xác nhận đã được gửi', message: `Gửi tới ${user.email}` });
      }
    } else {
      showToast({ type: 'error', title: 'Không gửi được mã', message: res.error });
    }
  };

  const handleResend = async () => {
    const res = await sendVerificationCode();
    if (res.ok && res.demo && res.devCode) {
      showToast({
        type: 'warning',
        title: 'Chưa cấu hình SMTP',
        message: `Mã phát triển: ${res.devCode} (hết hạn sau 5 phút)`,
        duration: 10000,
      });
    }
  };

  const handleSubmitEmail = async () => {
    const res = await changeEmail(code, newEmail);
    if (res.ok) {
      showToast({ type: 'success', title: 'Đổi email thành công', message: `Email mới: ${newEmail.trim()}` });
      onClose();
    } else {
      setError(res.error ?? 'Đổi email thất bại');
    }
  };

  const handleSubmitPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới chưa khớp');
      return;
    }
    const res = await changePassword(code, currentPassword, newPassword);
    if (res.ok) {
      showToast({ type: 'success', title: 'Đổi mật khẩu thành công' });
      onClose();
    } else {
      setError(res.error ?? 'Đổi mật khẩu thất bại');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'email' ? 'Đổi email' : 'Đổi mật khẩu'}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md overflow-hidden animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-white">
            {mode === 'email' ? 'Đổi email' : 'Đổi mật khẩu'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {step === 'request' ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Chúng tôi sẽ gửi mã xác nhận về email hiện tại{' '}
                <span className="font-semibold">{user.email}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSendCode}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Send className="w-4 h-4" />
                  Gửi mã xác nhận
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-green-800 dark:text-green-300 font-medium">Đã gửi mã tới {user.email}</p>
                  <p className="text-xs text-green-600/80 dark:text-green-400/70 mt-0.5">
                    Kiểm tra hộp thư của bạn. Mã hết hạn sau 5 phút.
                  </p>
                </div>
              </div>

              {/* Code input */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Mã xác nhận
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''));
                      setError(null);
                    }}
                    className="flex-1 max-w-[180px] px-4 py-3 text-lg font-mono tracking-[0.4em] text-center border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••"
                  />
                  <button
                    onClick={handleResend}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Gửi lại mã
                  </button>
                </div>
              </div>

              {mode === 'email' ? (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                    Email mới
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email.moi@example.com"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3.5 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={mode === 'email' ? handleSubmitEmail : handleSubmitPassword}
                  disabled={code.length !== 6 || (mode === 'email' ? !newEmail.trim() : !currentPassword || !newPassword || !confirmPassword)}
                  className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    code.length === 6 && (mode === 'email' ? newEmail.trim() : currentPassword && newPassword && confirmPassword)
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ProfilePage() {
  return <ProfilePageInner />;
}
