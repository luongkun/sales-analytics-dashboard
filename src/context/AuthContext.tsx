import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, errMessage, getToken, setToken } from '../lib/api';
import type { OrderItem, PublicUser } from '../lib/types';
import { connectRealtime, disconnectRealtime, subscribe } from '../realtime/client';
import { useToast } from './ToastContext';
import { analyticsLocalRefresh } from '../lib/analytics';

interface AuthValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (name: string, email: string, password: string) => Promise<PublicUser>;
  loginWithGoogle: (accessToken: string) => Promise<PublicUser>;
  logout: () => void;
  refreshUser: () => Promise<PublicUser | null>;
  placeOrder: (items: OrderItem[], total: number) => Promise<{ ok: boolean; balance?: number; error?: string }>;
  purchaseUpgrade: (upgradeId: string, price: number) => Promise<{ ok: boolean; error?: string }>;
  addBalance: (amount: number, method?: string) => Promise<Record<string, any> | null>;
  sendVerificationCode: () => Promise<string | null>;
  changeEmail: (code: string, newEmail: string) => Promise<boolean>;
  changePassword: (code: string, currentPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

const REASON_MESSAGES: Record<string, string> = {
  'admin-edit': 'Quản trị viên vừa cập nhật thông tin tài khoản của bạn.',
  topup: 'Số dư của bạn vừa được cập nhật từ một phiên đăng nhập khác.',
  order: 'Một đơn hàng mới vừa được đặt từ tài khoản của bạn.',
  upgrade: 'Gói nâng cấp của bạn vừa được cập nhật.',
  profile: 'Hồ sơ của bạn vừa được cập nhật từ một phiên khác.',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<PublicUser | null>(null);
  const toast = useToast();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Bootstrap: verify token
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: PublicUser }>('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // Realtime wiring theo user
  useEffect(() => {
    const token = getToken();
    if (!token || !user) return;
    const myEmail = user.email;
    connectRealtime(token);

    const unsubs: (() => void)[] = [];

    unsubs.push(
      subscribe('user:updated', (payload: any) => {
        if (payload?.email !== myEmail) return;
        if (payload?.user) setUser(payload.user);
        if (payload?.actor === myEmail) return; // mình tự thao tác — khỏi toast
        const msg = REASON_MESSAGES[payload?.reason] || 'Dữ liệu tài khoản của bạn vừa được cập nhật.';
        toast.showToast({ type: 'info', title: 'Dữ liệu đã đồng bộ', message: msg });
      }),
    );

    unsubs.push(
      subscribe('user:deleted', (payload: any) => {
        if (payload?.email !== myEmail) return;
        toast.showToast({
          type: 'warning',
          title: 'Phiên đăng nhập không còn hiệu lực',
          message: 'Tài khoản đã bị xóa hoặc email đã thay đổi ở nơi khác.',
          duration: 6000,
        });
        doLogout();
      }),
    );

    return () => {
      for (const u of unsubs) u();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const doLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    disconnectRealtime();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const d = await api<{ token: string; user: PublicUser }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const d = await api<{ token: string; user: PublicUser }>('/auth/register', {
      method: 'POST',
      auth: false,
      body: { name, email, password },
    });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const d = await api<{ token: string; user: PublicUser }>('/auth/google', {
      method: 'POST',
      auth: false,
      body: { access_token: accessToken },
    });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return null;
    try {
      const d = await api<{ user: PublicUser }>('/auth/me');
      setUser(d.user);
      return d.user;
    } catch {
      return null;
    }
  }, []);

  const placeOrder = useCallback(
    async (items: OrderItem[], total: number) => {
      try {
        const d = await api<{ balance: number }>('/orders', { method: 'POST', body: { items, total } });
        setUser((u) => (u ? { ...u, balance: d.balance } : u));
        analyticsLocalRefresh();
        return { ok: true, balance: d.balance };
      } catch (e) {
        return { ok: false, error: errMessage(e) };
      }
    },
    [],
  );

  const purchaseUpgrade = useCallback(
    async (upgradeId: string, price: number) => {
      try {
        const d = await api<{ balance: number }>('/upgrades/purchase', { method: 'POST', body: { upgradeId, price } });
        setUser((u) => (u ? { ...u, balance: d.balance, purchasedUpgrades: [...u.purchasedUpgrades, upgradeId] } : u));
        analyticsLocalRefresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errMessage(e) };
      }
    },
    [],
  );

  const addBalance = useCallback(
    async (amount: number, method?: string) => {
      try {
        const d = await api<Record<string, any>>('/balance/topup', { method: 'POST', body: { amount, method } });
        setUser((u) => (u ? { ...u, balance: d.balance, totalTopup: d.totalTopup, vip: d.tierUp ? { level: d.tierUp.level, name: d.tierUp.name, bonusPct: u.vip?.bonusPct ?? 0 } : u.vip } : u));
        analyticsLocalRefresh();
        return d;
      } catch (e) {
        toast.showToast({ type: 'error', title: 'Nạp tiền thất bại', message: errMessage(e) });
        return null;
      }
    },
    [toast],
  );

  const sendVerificationCode = useCallback(async () => {
    try {
      const d = await api<{ devCode: string }>('/auth/send-code', { method: 'POST', body: {} });
      return d.devCode;
    } catch (e) {
      toast.showToast({ type: 'error', title: 'Không gửi được mã', message: errMessage(e) });
      return null;
    }
  }, [toast]);

  const changeEmail = useCallback(
    async (code: string, newEmail: string) => {
      try {
        const d = await api<{ token: string; user: PublicUser }>('/auth/change-email', {
          method: 'POST',
          body: { code, newEmail },
        });
        setToken(d.token);
        setUser(d.user);
        return true;
      } catch (e) {
        toast.showToast({ type: 'error', title: 'Đổi email thất bại', message: errMessage(e) });
        return false;
      }
    },
    [toast],
  );

  const changePassword = useCallback(
    async (code: string, currentPassword: string, newPassword: string) => {
      try {
        await api('/auth/change-password', { method: 'POST', body: { code, currentPassword, newPassword } });
        return true;
      } catch (e) {
        toast.showToast({ type: 'error', title: 'Đổi mật khẩu thất bại', message: errMessage(e) });
        return false;
      }
    },
    [toast],
  );

  const value: AuthValue = {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout: doLogout,
    refreshUser,
    placeOrder,
    purchaseUpgrade,
    addBalance,
    sendVerificationCode,
    changeEmail,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
