import { useState } from 'react';
import {
  BarChart3,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'w-5 h-5'} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [shake, setShake] = useState(false);

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailInvalid = emailTouched && (email.trim() === '' || !EMAIL_RE.test(email.trim()));
  const nameInvalid = nameTouched && mode === 'register' && name.trim().length < 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailTouched(true);
    setNameTouched(true);
    if (mode === 'register') {
      setPasswordTouched(true);
      if (name.trim().length < 2) return;
      if (!EMAIL_RE.test(email.trim())) return;
      if (password.length < 6) return;
      if (confirmPassword !== password) {
        setConfirmTouched(true);
        return;
      }
    }
    setConfirmTouched(false);
    if (!EMAIL_RE.test(email.trim())) {
      return;
    }
    const result = mode === 'login' ? await login(email, password) : await register(name, email, password);
    if (!result.ok && result.error) {
      fail(result.error);
    }
  };

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);

  const handleGoogleLogin = () => {
    setError('');
    if (!GOOGLE_CLIENT_ID) {
      setShowGoogleSetup(true);
      return;
    }
    const g = (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient: (c: Record<string, unknown>) => { requestAccessToken: (o?: Record<string, unknown>) => void } } } } }).google;
    if (!g?.accounts?.oauth2) {
      fail('Chưa tải được Google SDK. Kiểm tra kết nối mạng và refresh trang.');
      return;
    }
    const client = g.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (resp: { access_token?: string }) => {
        if (!resp.access_token) {
          fail('Đăng nhập Google bị hủy');
          return;
        }
        const result = await loginWithGoogle(resp.access_token);
        if (!result.ok && result.error) {
          fail(result.error);
        }
      },
      error_callback: () => {
        fail('Đăng nhập Google bị hủy hoặc bị chặn popup');
      },
    });
    client.requestAccessToken();
  };

  return (
    <div className="app-bg min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/40 to-indigo-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-up">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/40 mb-4">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Analytics <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'login' ? 'Đăng nhập để tiếp tục phân tích dữ liệu' : 'Tạo tài khoản mới trong 10 giây'}
          </p>
        </div>

        {/* Card */}
        <div
          className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-2xl shadow-indigo-500/10 animate-fade-up ${
            shake ? 'animate-shake' : ''
          }`}
        >
          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-pop-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Họ và tên
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      nameInvalid
                        ? 'border-red-300 dark:border-red-500/50'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  />
                </div>
                {nameInvalid && (
                  <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {name.trim() === '' ? 'Vui lòng nhập họ và tên' : 'Tên cần tối thiểu 2 ký tự'}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    emailInvalid
                      ? 'border-red-300 dark:border-red-500/50'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                />
              </div>
                {emailInvalid && (
                  <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {email.trim() === '' ? 'Vui lòng nhập email' : 'Email không hợp lệ'}
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`w-full pl-11 pr-11 py-2.5 bg-gray-50 dark:bg-gray-700/60 border rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    mode === 'register' && passwordTouched && password.length < 6
                      ? 'border-red-300 dark:border-red-500/50'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {mode === 'register' && passwordTouched && password.length < 6 && (
                <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                  <AlertCircle className="w-3 h-3" />
                  {password === '' ? 'Vui lòng nhập mật khẩu' : 'Mật khẩu tối thiểu 6 ký tự'}
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/60 border rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      confirmTouched && confirmPassword !== password
                        ? 'border-red-300 dark:border-red-500/50'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  />
                </div>
                {confirmTouched && confirmPassword !== password && (
                  <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {confirmPassword === '' ? 'Vui lòng xác nhận mật khẩu' : 'Mật khẩu chưa khớp'}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  Đăng nhập
                </>
              ) : (
                <>
                  <UserPlus className="w-4.5 h-4.5" />
                  Tạo tài khoản
                </>
              )}
            </button>
          </form>

          {/* Divider + Google login */}
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
              <span className="text-xs text-gray-400 dark:text-gray-500">hoặc</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            </div>
            <button
              onClick={handleGoogleLogin}
              className="mt-4 w-full flex items-center justify-center gap-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-400 text-gray-700 dark:text-white! font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-md transition-all"
            >
              <GoogleIcon />
              {mode === 'login' ? 'Đăng nhập với Google' : 'Đăng ký với Google'}
            </button>
          </div>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {mode === 'login' ? (
                <>
                  Chưa có tài khoản? <span className="font-semibold text-blue-600 dark:text-blue-400">Đăng ký ngay</span>
                </>
              ) : (
                <>
                  Đã có tài khoản? <span className="font-semibold text-blue-600 dark:text-blue-400">Đăng nhập</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-6 grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
          {[
            { icon: ShieldCheck, label: 'Bảo mật SSL', sub: 'Mã hóa 256-bit' },
            { icon: Lock, label: 'Quyền riêng tư', sub: 'Dữ liệu của bạn' },
            { icon: BadgeCheck, label: 'Uy tín', sub: '10.000+ người dùng' },
          ].map((b) => (
            <div
              key={b.label}
              className="flex flex-col items-center text-center gap-1 p-3.5 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/60 dark:border-white/10"
            >
              <b.icon className="w-5 h-5 text-emerald-500" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight">{b.label}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{b.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {showGoogleSetup && <GoogleSetupHint onClose={() => setShowGoogleSetup(false)} />}
    </div>
  );
}

function GoogleSetupHint({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Chưa cấu hình Google"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md overflow-hidden animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-white">Chưa cấu hình Google OAuth</h2>
        </div>
        <div className="p-5 space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>Để bật đăng nhập bằng Google, cần tạo OAuth Client ID (miễn phí):</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              Truy cập{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Google Cloud Console → Credentials
              </a>
            </li>
            <li>Create Credentials → OAuth client ID → Web application</li>
            <li>
              Authorized JavaScript origins thêm: <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">http://localhost:3000</code>
            </li>
            <li>Copy Client ID, dán vào <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">server/.env</code> (GOOGLE_CLIENT_ID) và <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">.env.local</code> (VITE_GOOGLE_CLIENT_ID)</li>
            <li>Khởi động lại server + dev server</li>
          </ol>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
