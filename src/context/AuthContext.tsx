import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { api, setToken, getToken, ApiError } from '../api';

export interface User {
  name: string;
  email: string;
  role: 'admin' | 'member';
  balance: number;
  purchasedUpgrades: string[];
  avatar?: string;
}

type Result = { ok: boolean; error?: string; demo?: boolean; devCode?: string; bonus?: number; balance?: number };

interface CartItemPayload {
  productId: string;
  name: string;
  quantity: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Result>;
  register: (name: string, email: string, password: string) => Promise<Result>;
  logout: () => void;
  loginWithGoogle: (credential: string) => Promise<Result>;
  purchaseUpgrade: (upgradeId: string, price: number) => Promise<boolean>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<Result>;
  sendVerificationCode: () => Promise<Result>;
  changeEmail: (code: string, newEmail: string) => Promise<Result>;
  changePassword: (code: string, currentPassword: string, newPassword: string) => Promise<Result>;
  placeOrder: (items: CartItemPayload[], total: number) => Promise<Result>;
  addBalance: (amount: number, method: string) => Promise<Result>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Không thể kết nối tới máy chủ';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Migration 1 lần: gộp data cũ từ localStorage (thời chưa có backend) — chỉ data của đúng email đang đăng nhập
  useEffect(() => {
    if (!user || localStorage.getItem('migrated-to-server-v2')) return;
    const MIGRATION_KEY = 'migrated-to-server-v2';
    localStorage.setItem(MIGRATION_KEY, '1'); // chống lặp ngay cả khi API lỗi
    let legacyName = '';
    let legacyAvatar = '';
    let legacyUpgrades: string[] = [];
    let legacyBalance = 0;
    try {
      const usersRaw = localStorage.getItem('auth-users');
      const sessionRaw = localStorage.getItem('auth-session');
      const email = user.email.toLowerCase();
      if (usersRaw) {
        // Tìm đúng user theo email trong danh sách user cũ
        const legacyUsers = JSON.parse(usersRaw) as Array<{
          email?: string;
          name?: string;
          avatar?: string;
          balance?: number;
          purchasedUpgrades?: string[];
        }>;
        const match = legacyUsers.find((u) => (u.email || '').toLowerCase() === email);
        if (match) {
          legacyName = match.name || '';
          legacyAvatar = match.avatar || '';
          legacyUpgrades = Array.isArray(match.purchasedUpgrades) ? match.purchasedUpgrades : [];
          legacyBalance = Number(match.balance || 0);
        }
      }
      // Fallback: phiên đăng nhập cũ (chỉ dùng nếu email khớp)
      if (!legacyName && !legacyAvatar && !legacyUpgrades.length && !legacyBalance && sessionRaw) {
        const legacySession = JSON.parse(sessionRaw) as {
          email?: string;
          name?: string;
          avatar?: string;
          balance?: number;
          purchasedUpgrades?: string[];
        };
        if ((legacySession.email || '').toLowerCase() === email) {
          legacyName = legacySession.name || '';
          legacyAvatar = legacySession.avatar || '';
          legacyUpgrades = Array.isArray(legacySession.purchasedUpgrades) ? legacySession.purchasedUpgrades : [];
          legacyBalance = Number(legacySession.balance || 0);
        }
      }
    } catch {
      // ignore
    }
    if (!legacyUpgrades.length && !legacyBalance && !legacyName && !legacyAvatar) return;
    api('/profile/migrate', {
      method: 'POST',
      body: {
        name: legacyName || undefined,
        avatar: legacyAvatar || undefined,
        purchasedUpgrades: legacyUpgrades,
        balance: legacyBalance,
      },
    })
      .then((res) => {
        setUser((res as { user: User }).user);
        localStorage.removeItem('auth-users');
        localStorage.removeItem('auth-session');
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await api<{ user: User }>('/auth/me');
        if (!cancelled) setUser(res.user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<Result> => {
      try {
        const res = await api<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        setToken(res.token);
        setUser(res.user);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: toError(err) };
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<Result> => {
      try {
        const res = await api<{ token: string; user: User }>('/auth/register', {
          method: 'POST',
          body: { name, email, password },
        });
        setToken(res.token);
        setUser(res.user);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: toError(err) };
      }
    },
    []
  );

  const loginWithGoogle = useCallback(
    async (accessToken: string): Promise<Result> => {
      try {
        const res = await api<{ token: string; user: User }>('/auth/google', {
          method: 'POST',
          body: { accessToken },
        });
        setToken(res.token);
        setUser(res.user);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: toError(err) };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const purchaseUpgrade = useCallback(
    async (upgradeId: string, price: number): Promise<boolean> => {
      try {
        const res = await api<{ user: User; balance: number; purchasedUpgrades: string[] }>(
          '/upgrades/purchase',
          { method: 'POST', body: { upgradeId, price } }
        );
        setUser((prev) => (prev ? { ...prev, balance: res.balance, purchasedUpgrades: res.purchasedUpgrades } : prev));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const updateProfile = useCallback(async (data: { name?: string; avatar?: string }): Promise<Result> => {
    try {
      const res = await api<{ user: User }>('/profile', { method: 'PUT', body: data });
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toError(err) };
    }
  }, []);

  const sendVerificationCode = useCallback(async (): Promise<Result> => {
    try {
      const res = await api<{ demo?: boolean; code?: string }>('/auth/send-code', { method: 'POST' });
      return { ok: true, demo: res.demo, devCode: res.code };
    } catch (err) {
      return { ok: false, error: toError(err) };
    }
  }, []);

  const changeEmail = useCallback(async (code: string, newEmail: string): Promise<Result> => {
    try {
      const res = await api<{ token: string; user: User }>('/auth/change-email', {
        method: 'POST',
        body: { code, newEmail },
      });
      setToken(res.token);
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toError(err) };
    }
  }, []);

  const changePassword = useCallback(
    async (code: string, currentPassword: string, newPassword: string): Promise<Result> => {
      try {
        await api('/auth/change-password', {
          method: 'POST',
          body: { code, currentPassword, newPassword },
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: toError(err) };
      }
    },
    []
  );

  const placeOrder = useCallback(
    async (items: CartItemPayload[], total: number): Promise<Result> => {
      try {
        const res = await api<{ order: { id: string }; balance: number }>('/orders', {
          method: 'POST',
          body: { items, total },
        });
        setUser((prev) => (prev ? { ...prev, balance: res.balance } : prev));
        return { ok: true, balance: res.balance };
      } catch (err) {
        return { ok: false, error: toError(err) };
      }
    },
    []
  );

  const addBalance = useCallback(
    async (amount: number, method: string): Promise<Result> => {
      try {
        const res = await api<{ balance: number; bonus: number }>('/balance/topup', {
          method: 'POST',
          body: { amount, method },
        });
        setUser((prev) => (prev ? { ...prev, balance: res.balance } : prev));
        return { ok: true, bonus: res.bonus, balance: res.balance };
      } catch (err) {
        return { ok: false, error: toError(err) };
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, loginWithGoogle, purchaseUpgrade, updateProfile, sendVerificationCode, changeEmail, changePassword, placeOrder, addBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
