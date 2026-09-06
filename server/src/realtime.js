/**
 * realtime.js — cầu nối Express (3001) → socket.io service (3003)
 * Kết nối như client "system" (JWT system@realtime.internal) và phát 'broadcast'
 * → service relay tới room tương ứng cho các client user.
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
  if (socket && socket.connected) {
    socket.emit('broadcast', { room, event, payload });
  }
}
