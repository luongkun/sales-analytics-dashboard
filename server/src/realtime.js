/**
 * realtime.js — phát realtime event cho client
 *
 * 2 chế độ:
 * - SANDBOX (mặc định): cầu nối socket.io-client → service 3003 (qua gateway Caddy)
 * - DEPLOY=1 (Render/hosting 1 process): socket.io server gắn trực tiếp vào Express —
 *   gọi setRealtimeLocal(io) lúc khởi động, broadcast() phát thẳng in-process.
 */
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REALTIME_URL = process.env.REALTIME_URL || 'http://localhost:3003';
const SYSTEM_EMAIL = 'system@realtime.internal';

let socket = null;
let connected = false;
let localIo = null; // DEPLOY mode: socket.io server in-process

/** DEPLOY mode — đăng ký io server nội bộ, bỏ qua cầu nối 3003 */
export function setRealtimeLocal(ioInstance) {
  localIo = ioInstance;
}

export function connectRealtimeBridge() {
  const token = jwt.sign({ email: SYSTEM_EMAIL, role: 'system' }, JWT_SECRET, { expiresIn: '1d' });
  socket = io(REALTIME_URL, {
    path: '/',
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10_000,
    timeout: 10_000,
  });
  socket.on('connect', () => {
    connected = true;
    console.log('[realtime] system channel đã kết nối');
  });
  socket.on('disconnect', (reason) => {
    connected = false;
    console.log('[realtime] system channel ngắt —', reason);
  });
  socket.on('connect_error', (err) => {
    if (connected !== false) {
      connected = false;
      console.warn('[realtime] kết nối thất bại:', err.message);
    }
  });
  return socket;
}

/**
 * Phát event tới realtime service.
 * @param {string|null} room null = mọi client · 'user:email' = riêng user
 * @param {string} event tên event (vd 'user:updated', 'order:created'...)
 * @param {unknown} payload
 */
export function broadcast(room, event, payload) {
  if (localIo) {
    if (room) localIo.to(room).emit(event, payload ?? null);
    else localIo.emit(event, payload ?? null);
    return;
  }
  if (socket && socket.connected) {
    socket.emit('broadcast', { room, event, payload });
  }
}
