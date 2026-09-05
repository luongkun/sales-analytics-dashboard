import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { api, setToken, getToken, ApiError } from '../api';
import { useToast } from './ToastContext';
import {
  connectRealtime,
  disconnectRealtime,
  onRealtime,
  type UserUpdatedPayload,
  type UserDeletedPayload,
  type OrderCreatedPayload,
} from '../realtime/client';

export interface User {
  name: string;
  email: string;
  role: 'admin' | 'member';
  balance: number;
  purchasedUpgrades: string[];
  avatar?: string;
  totalTopup?: number;
  /** null = VIP tự động theo tổng nạp · 0 = không VIP · 1-4 = admin đặt hạng cứng */
  vipOverride?: number | null;
  vip?: { level: number; name: string; bonusPct: number } | null;
}

type Result = { ok: boolean; error?: string; demo?: boolean; devCode?: string; bonus?: number; balance?: number; vipBonus?: number; totalTopup?: number; tierUp?: { level: number; name: string } | null };

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
  refreshUser: () => Promise<void>;
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
  const { showToast } = useToast();

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

  // Làm mới dữ liệu user (số dư, tên, gói...) từ server mà không cần đăng nhập lại.
  // Dùng khi dữ liệu user bị thay đổi bên ngoài (vd: admin sửa số dư chính tài khoản này).
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!getToken()) return;
    try {
      const res = await api<{ user: User }>('/auth/me');
      setUser(res.user);
    } catch {
      // Token hết hạn/sai — giữ nguyên state; login flow sẽ xử lý
    }
  }, []);

  // ---------- Realtime sync (socket.io qua gateway /?XTransformPort=3003) ----------
  // Mọi thay đổi dữ liệu từ server (hoặc từ phiên đăng nhập khác) sẽ được đẩy về
  // tức thì: số dư, hồ sơ, gói nâng cấp, đơn hàng, xóa tài khoản...
  const myEmail = user ? user.email.toLowerCase() : null;
  useEffect(() => {
    if (!myEmail) {
      disconnectRealtime();
      return;
    }
    const token = getToken();
    if (!token) return;
    connectRealtime(token);

    const isSelf = (actor?: string) => !!actor && actor.toLowerCase() === myEmail;

    const handleUserUpdated = (p: UserUpdatedPayload) => {
      if (p.email && p.email.toLowerCase() !== myEmail) return;
      refreshUser();
      // Chỉ toast khi thay đổi do NGƯỜI KHÁC (vd quản trị viên sửa, hoặc tự sửa ở thiết bị khác)
      if (!isSelf(p.actor)) {
        const messages: Record<string, string> = {
          'admin-edit': 'Quản trị viên vừa cập nhật thông tin tài khoản của bạn.',
          topup: 'Số dư của bạn vừa được cập nhật từ một phiên đăng nhập khác.',
          order: 'Một đơn hàng mới vừa được đặt từ tài khoản của bạn.',
          upgrade: 'Gói nâng cấp của bạn vừa được cập nhật.',
          profile: 'Hồ sơ của bạn vừa được cập nhật từ một phiên khác.',
        };
        showToast({
          type: 'info',
          title: 'Dữ liệu vừa được đồng bộ',
          message: messages[p.reason || ''] || 'Dữ liệu tài khoản của bạn vừa được cập nhật.',
        });
      }
    };

    const handleUserDeleted = (p: UserDeletedPayload) => {
      if (p.email && p.email.toLowerCase() !== myEmail) return;
      // Chính mình đổi email ở phiên này → API đã trả token mới, bỏ qua
      if (p.reason === 'email-changed' && isSelf(p.actor)) return;
      showToast({
        type: 'warning',
        title: 'Phiên đăng nhập không còn hiệu lực',
        message: 'Tài khoản đã bị xóa hoặc email đã thay đổi ở nơi khác.',
      });
      setToken(null);
      setUser(null);
      disconnectRealtime();
    };

    const handleOrderCreated = (p: OrderCreatedPayload) => {
      if (p.email && p.email.toLowerCase() !== myEmail) return;
      if (isSelf(p.actor)) return; // mình tự đặt — trang checkout đã toast
      showToast({
        type: 'success',
        title: 'Đơn hàng mới',
        message: `Đơn ${p.order?.id || ''} vừa được tạo từ tài khoản của bạn.`,
      });
    };

    const off1 = onRealtime<UserUpdatedPayload>('user:updated', handleUserUpdated);
    const off2 = onRealtime<UserDeletedPayload>('user:deleted', handleUserDeleted);
    const off3 = onRealtime<OrderCreatedPayload>('order:created', handleOrderCreated);
    return () => {
      off1();
      off2();
      off3();
    };
  }, [myEmail, refreshUser, showToast]);

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
        const res = await api<{ balance: number; bonus: number; vipBonus: number; totalTopup: number; tierUp: { level: number; name: string } | null }>('/balance/topup', {
          method: 'POST',
          body: { amount, method },
        });
        setUser((prev) => (prev ? { ...prev, balance: res.balance, totalTopup: res.totalTopup } : prev));
        return { ok: true, bonus: res.bonus, vipBonus: res.vipBonus, balance: res.balance, totalTopup: res.totalTopup, tierUp: res.tierUp };
      } catch (err) {
        return { ok: false, error: toError(err) };
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, loginWithGoogle, refreshUser, purchaseUpgrade, updateProfile, sendVerificationCode, changeEmail, changePassword, placeOrder, addBalance }}
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
