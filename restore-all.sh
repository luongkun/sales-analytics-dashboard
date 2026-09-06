#!/bin/bash
# =============================================================
# SALES SUITE PRO — SCRIPT KHÔI PHỤC SAU SANDBOX RESET (1 LỆNH)
# Chạy: bash /home/z/sales-analytics-dashboard/restore-all.sh
# =============================================================
set -e
cd /home/z/sales-analytics-dashboard

echo "═══════════════════════════════════════════════"
echo "  SALES SUITE PRO — RESTORE TOÀN BỘ HỆ THỐNG"
echo "═══════════════════════════════════════════════"

# ---------- 0. Server 3001 (backend Express) ----------
if curl -s -m 3 http://localhost:3001/api/health | rg -q '"ok":true'; then
  echo "[0] Backend 3001: ĐANG CHẠY ✓"
else
  echo "[0] Backend 3001: CHẾT → khởi động lại..."
  cd /home/z/sales-analytics-dashboard/server
  ( setsid nohup node src/index.js >> /tmp/server-3001.log 2>&1 < /dev/null & )
  cd /home/z/sales-analytics-dashboard
  sleep 3
  curl -s -m 3 http://localhost:3001/api/health && echo " → OK ✓" || echo " → LỖI! Xem /tmp/server-3001.log"
fi

# ---------- 1. Realtime 3003 (socket.io) ----------
if curl -s -m 3 -o /dev/null "http://localhost:3003/socket.io/?EIO=4&transport=polling"; then
  echo "[1] Realtime 3003: ĐANG CHẠY ✓"
else
  echo "[1] Realtime 3003: CHẾT → khởi động lại..."
  cd /home/z/my-project/mini-services/realtime-service
  ( setsid nohup bun --hot index.ts >> /tmp/realtime-3003.log 2>&1 < /dev/null & )
  cd /home/z/sales-analytics-dashboard
  sleep 3
  curl -s -m 3 -o /dev/null "http://localhost:3003/socket.io/?EIO=4&transport=polling" && echo " → OK ✓" || echo " → LỖI! Xem /tmp/realtime-3003.log"
fi

# ---------- 2. Frontend bundle (public/app) ----------
if [ -f /home/z/my-project/public/app/index.html ] && ls /home/z/my-project/public/app/assets/index-*.js >/dev/null 2>&1; then
  echo "[2] Frontend bundle /app/: CÒN NGUYÊN ✓"
else
  echo "[2] Frontend bundle: MẤT → build lại từ source..."
  npx tsc -b && npx vite build
  mkdir -p /home/z/my-project/public/app
  cp -r dist/. /home/z/my-project/public/app/
  cp /home/z/sales-analytics-dashboard/public/*.{svg,png,webmanifest} /home/z/my-project/public/app/ 2>/dev/null || true
  echo " → Đã build + deploy ✓"
fi

# ---------- 3. Next.js 3000 (dev server) ----------
if curl -s -m 5 -o /dev/null http://localhost:3000; then
  echo "[3] Next.js 3000: ĐANG CHẠY ✓"
else
  echo "[3] Next.js 3000: không phản hồi — có thể cần 'bun run dev' trong /home/z/my-project"
fi

# ---------- 4. Verify login ----------
echo "[4] Test đăng nhập admin@luongkun.io..."
TOKEN=$(curl -s -m 5 -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@luongkun.io","password":"123456"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token||'FAIL')}catch{console.log('FAIL')}})")
if [ "$TOKEN" != "FAIL" ] && [ -n "$TOKEN" ]; then
  echo "    LOGIN OK ✓ (token hợp lệ)"
  curl -s -m 5 http://localhost:3001/api/products -H "Authorization: Bearer $TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d).products||[];p.forEach(x=>console.log('    Sản phẩm: '+x.id+' — slot '+x.bookedSlots+'/'+x.totalSlots))})"
else
  echo "    LOGIN LỖI! Kiểm tra server + DB app.db"
fi

echo "═══════════════════════════════════════════════"
echo "  XONG! Mở Preview Panel để dùng app."
echo "  (Nếu source mất hẳn: git checkout . rồi chạy script này)"
echo "═══════════════════════════════════════════════"
