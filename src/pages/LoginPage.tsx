import { useState } from 'react';
import { BarChart3, CircleAlert, Eye, EyeOff, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMessage } from '../lib/api';

type Mode = 'login' | 'register';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  return (
    <div className="app-bg min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-indigo-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthCard mode={mode} onSwitchMode={() => setMode(mode === 'login' ? 'register' : 'login')} />
        <TrustBadges />
      </div>
    </div>
  );
}

function AuthCard({ mode, onSwitchMode }: { mode: Mode; onSwitchMode: () => void }) {
  const isLogin = mode === 'login';
  const { login, register, loginWithGoogle } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [googleModal, setGoogleModal] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isLogin) {
      if (!name.trim()) e.name = 'Vui lòng nhập họ và tên';
      else if (name.trim().length < 2) e.name = 'Tên cần tối thiểu 2 ký tự';
    }
    if (!email.trim()) e.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Email không hợp lệ';
    if (!password) e.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (!isLogin) {
      if (!confirm) e.confirm = 'Vui lòng xác nhận mật khẩu';
      else if (confirm !== password) e.confirm = 'Mật khẩu chưa khớp';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isLogin) await login(email.trim().toLowerCase(), password);
      else await register(name.trim(), email.trim().toLowerCase(), password);
    } catch (err) {
      setServerError(errMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    const gsi = (window as any).google?.accounts?.id;
    if (!clientId || !gsi) {
      setGoogleModal(true);
      return;
    }
    try {
      gsi.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          try {
            await loginWithGoogle(resp.credential);
          } catch (err) {
            toast.showToast({ type: 'error', title: 'Đăng nhập Google thất bại', message: errMessage(err) });
          }
        },
      });
      gsi.prompt();
    } catch {
      setGoogleModal(true);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/40 flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-white" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analytics <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isLogin ? 'Đăng nhập để tiếp tục phân tích dữ liệu' : 'Tạo tài khoản mới trong 10 giây'}
        </p>
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-2xl shadow-indigo-500/10 animate-fade-up">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {!isLogin && (
            <Field
              label="Họ và tên"
              icon={<User size={16} />}
              error={errors.name}
              input={
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  className={inputCls(!!errors.name)}
                />
              }
            />
          )}
          <Field
            label="Email"
            icon={<Mail size={16} />}
            error={errors.email}
            input={
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls(!!errors.email)}
              />
            }
          />
          <Field
            label="Mật khẩu"
            icon={<Lock size={16} />}
            error={errors.password}
            suffix={
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            input={
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={inputCls(!!errors.password)}
              />
            }
          />
          {!isLogin && (
            <Field
              label="Xác nhận mật khẩu"
              icon={<Lock size={16} />}
              error={errors.confirm}
              input={
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={inputCls(!!errors.confirm)}
                />
              }
            />
          )}

          {serverError && (
            <p className="text-sm text-rose-500 bg-rose-500/10 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <CircleAlert size={15} className="flex-shrink-0" /> {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn size={16} /> Đăng nhập
              </>
            ) : (
              <>
                <UserPlus size={16} /> Tạo tài khoản
              </>
            )}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">hoặc</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          onClick={onGoogle}
          className="w-full py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-400 font-semibold rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2.5 text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.514 6.871 29.599 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.514 6.871 29.599 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.619-3.317-11.283-7.947l-6.522 5.025C9.505 39.556 16.228 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.572l.006-.005 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          {isLogin ? 'Đăng nhập với Google' : 'Đăng ký với Google'}
        </button>

        <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          {isLogin ? (
            <>
              Chưa có tài khoản?{' '}
              <button onClick={onSwitchMode} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button onClick={onSwitchMode} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Đăng nhập
              </button>
            </>
          )}
        </p>
      </div>

      {googleModal && <GoogleSetupModal onClose={() => setGoogleModal(false)} />}
    </>
  );
}

function inputCls(hasError: boolean) {
  return `w-full pl-11 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/60 border ${
    hasError ? 'border-rose-400 dark:border-rose-500/60' : 'border-gray-200 dark:border-gray-600'
  } rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-colors`;
}

function Field({ label, icon, input, error, suffix }: { label: string; icon: React.ReactNode; input: React.ReactNode; error?: string; suffix?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
        {input}
        {suffix}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
          <CircleAlert size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function GoogleSetupModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-pop-in">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cấu hình đăng nhập Google</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Để bật đăng nhập Google, thêm Client ID OAuth vào cấu hình:</p>
        <ol className="mt-4 space-y-2.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
          <li>Vào <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Google Cloud Console</span> → Credentials</li>
          <li>Tạo OAuth client ID (Web application)</li>
          <li>Authorized JavaScript origins: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">http://localhost:3000</span></li>
          <li>Copy Client ID dán vào <span className="font-mono text-xs">server/.env</span> (GOOGLE_CLIENT_ID) và <span className="font-mono text-xs">.env.local</span> (VITE_GOOGLE_CLIENT_ID)</li>
          <li>Restart server</li>
        </ol>
        <button onClick={onClose} className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30">
          Đã hiểu
        </button>
      </div>
    </div>
  );
}

function TrustBadges() {
  const items = [
    { title: 'Bảo mật SSL', sub: 'Mã hóa 256-bit' },
    { title: 'Quyền riêng tư', sub: 'Dữ liệu của bạn' },
    { title: 'Uy tín', sub: '10.000+ người dùng' },
  ];
  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {items.map((b) => (
        <div key={b.title} className="text-center">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{b.title}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{b.sub}</p>
        </div>
      ))}
    </div>
  );
}
