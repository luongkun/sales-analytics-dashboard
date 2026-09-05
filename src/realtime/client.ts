/**
 * Realtime client (socket.io) — đồng bộ dữ liệu tức thời giữa các phiên.
 *
 * Kết nối QUA GATEWAY theo quy ước môi trường:
 *   io("/?XTransformPort=3003")  → Caddy forward về mini-service realtime (port 3003)
 *   Path PHẢI là "/" (theo quy ước Caddy), KHÔNG viết port trực tiếp.
 *
 * Thiết kế singleton: toàn bộ app dùng chung 1 socket, đăng ký listener qua
 * onRealtime()/offRealtime(). AuthContext kết nối/ngắt theo trạng thái đăng nhập.
 */
import { io, type Socket } from 'socket.io-client';
import { getToken } from '../api';

export type RealtimeEvent =
  | 'user:updated'
  | 'user:deleted'
  | 'order:created'
  | 'order:updated'
  | 'users:changed'
  | 'analytics:changed';

export interface UserUpdatedPayload {
  email?: string;
  reason?: 'admin-edit' | 'topup' | 'order' | 'upgrade' | 'profile' | 'migrate';
  actor?: string;
  user?: {
    name: string;
    email: string;
    role: 'admin' | 'member';
    balance: number;
    purchasedUpgrades: string[];
    avatar?: string;
  };
}

export interface UserDeletedPayload {
  email?: string;
  reason?: 'deleted' | 'email-changed';
  actor?: string;
}

export interface OrderCreatedPayload {
  email?: string;
  order?: { id: string; items: unknown[]; total: number; timestamp: number };
  actor?: string;
}

export interface OrderUpdatedPayload {
  email?: string;
  orderId?: string;
  status?: string;
}

export interface UsersChangedPayload {
  type: 'created' | 'updated' | 'deleted' | 'bulk-delete' | 'bulk-role';
  email?: string;
  count?: number;
  actor?: string;
}

export interface AnalyticsChangedPayload {
  reason?: string;
  email?: string;
  count?: number;
}

type Listener = (payload: never) => void;
type TypedListener<T> = (payload: T) => void;

const listeners = new Map<RealtimeEvent, Set<Listener>>();

let socket: Socket | null = null;
let currentToken: string | null = null;
let connectErrorLogged = false;

function dispatch(event: RealtimeEvent, payload: unknown) {
  const set = listeners.get(event);
  if (!set || set.size === 0) return;
  for (const listener of set) {
    try {
      (listener as (p: unknown) => void)(payload);
    } catch (err) {
      console.error(`[realtime] listener error on "${event}":`, err);
    }
  }
}

/** Đăng ký listener realtime. Trả về hàm hủy đăng ký. */
export function onRealtime<T>(event: RealtimeEvent, listener: TypedListener<T>): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  const set = listeners.get(event)!;
  set.add(listener as Listener);
  return () => {
    set.delete(listener as Listener);
  };
}

export function offRealtime<T>(event: RealtimeEvent, listener: TypedListener<T>): void {
  listeners.get(event)?.delete(listener as Listener);
}

export function getRealtimeConnected(): boolean {
  return !!socket && socket.connected;
}

/** Kết nối (hoặc tái sử dụng) socket realtime với JWT hiện tại */
export function connectRealtime(token: string): Socket {
  if (socket && currentToken === token) return socket;
  disconnectRealtime();
  currentToken = token;

  socket = io('/?XTransformPort=3003', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    connectErrorLogged = false;
  });
  socket.on('connect_error', (err) => {
    if (!connectErrorLogged) {
      connectErrorLogged = true;
      console.warn('[realtime] kết nối thất bại, sẽ thử lại:', err.message);
    }
  });
  socket.on('user:updated', (p: UserUpdatedPayload) => dispatch('user:updated', p));
  socket.on('user:deleted', (p: UserDeletedPayload) => dispatch('user:deleted', p));
  socket.on('order:created', (p: OrderCreatedPayload) => dispatch('order:created', p));
  socket.on('order:updated', (p: OrderUpdatedPayload) => dispatch('order:updated', p));
  socket.on('users:changed', (p: UsersChangedPayload) => dispatch('users:changed', p));
  socket.on('analytics:changed', (p: AnalyticsChangedPayload) => dispatch('analytics:changed', p));

  return socket;
}

/** Ngắt kết nối realtime (khi đăng xuất) */
export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

/** Helper: lấy token từ localStorage rồi kết nối. Trả về socket hoặc null. */
export function connectRealtimeWithStoredToken(): Socket | null {
  const token = getToken();
  if (!token) return null;
  return connectRealtime(token);
}
