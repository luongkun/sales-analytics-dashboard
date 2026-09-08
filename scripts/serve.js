#!/usr/bin/env node
// =============================================================
// SALES SUITE PRO — chạy WEB CHUẨN (giống hệt https://salessuite.onrender.com)
//
// Web chuẩn là bundle đã build sẵn trong server/public/ — script này
// khởi động server Express ở chế độ DEPLOY=1 (1 process: web + API + realtime).
//
// Usage:  npm run dev   (hoặc npm start)   →   http://localhost:3001
// =============================================================
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const serverDir = join(root, '..', 'server');

// Lần đầu chạy: tự cài dependencies cho server (express, better-sqlite3, socket.io...)
if (!existsSync(join(serverDir, 'node_modules'))) {
  console.log('[serve] Lần đầu chạy — đang cài dependencies cho server (~1-2 phút, gồm build better-sqlite3)...');
  const res = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: serverDir,
    stdio: 'inherit',
    shell: true,
  });
  if (res.status !== 0) {
    console.error('[serve] npm install trong server/ thất bại — xem log phía trên');
    process.exit(1);
  }
}

const PORT = process.env.PORT || '3001';
const env = { ...process.env, DEPLOY: '1', PORT };

console.log('[serve] Khởi động Sales Suite Pro — chế độ DEPLOY (1 process: web + API + realtime + webhook)');
console.log(`[serve] Mở: http://localhost:${PORT}  (tự redirect sang /app — đúng web đang chạy trên Render)`);

const child = spawn(process.execPath, ['src/index.js'], {
  cwd: serverDir,
  env,
  stdio: 'inherit',
});

const forward = (sig) => () => {
  try { child.kill(sig); } catch { /* already dead */ }
};
process.on('SIGINT', forward('SIGINT'));
process.on('SIGTERM', forward('SIGTERM'));
child.on('exit', (code) => process.exit(code ?? 0));
