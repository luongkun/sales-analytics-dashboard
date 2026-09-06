import { io, type Socket } from 'socket.io-client';

type Handler = (payload: any) => void;

const listeners = new Map<string, Set<Handler>>();
let socket: Socket | null = null;
let currentToken: string | null = null;
let warned = false;

function emitLocal(event: string, payload: any) {
  const set = listeners.get(event);
  if (!set) return;
  for (const h of set) {
    try {
      h(payload);
    } catch (e) {
      console.error(`[realtime] listener error on "${event}":`, e);
    }
  }
}

export function subscribe(event: string, handler: Handler): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)!.delete(handler);
  };
}

export function getSocket(): Socket | null {
  return socket;
}

export function isConnected(): boolean {
  return !!socket && socket.connected;
}

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

  const events = [
    'user:updated',
    'user:deleted',
    'order:created',
    'order:updated',
    'users:changed',
    'analytics:changed',
    'products:changed',
  ];
  for (const ev of events) {
    socket.on(ev, (payload: any) => emitLocal(ev, payload));
  }

  socket.on('connect', () => {
    warned = false;
    emitLocal('connection:state', { connected: true });
  });
  socket.on('disconnect', () => {
    emitLocal('connection:state', { connected: false });
  });
  socket.on('connect_error', (err: Error) => {
    if (!warned) {
      warned = true;
      console.warn('[realtime] kết nối thất bại, sẽ thử lại:', err.message);
    }
    emitLocal('connection:state', { connected: false });
  });
  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

/** React hook */
import { useEffect } from 'react';
export function useRealtime(event: string, handler: Handler) {
  useEffect(() => subscribe(event, handler), [event, handler]);
}
