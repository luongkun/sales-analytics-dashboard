# Deploy miễn phí lên Render.com (*.onrender.com)

App chạy **1 process tự chủ**: Express serve web tĩnh + API + realtime socket.io cùng một port —
không cần Next.js wrapper, không cần Caddy gateway. Chỉ bật khi env `DEPLOY=1`.

## Triển khai (3 phút, 0đ, không cần thẻ ngân hàng)

1. Vào **https://dashboard.render.com** → đăng ký bằng tài khoản GitHub của bạn (luongkun).
2. **New → Blueprint** → chọn repo `sales-analytics-dashboard` → Render tự đọc `render.yaml` → **Apply**.
3. Chờ build ~2-3 phút → mở URL `https://salessuite.onrender.com`.

Đăng nhập demo: `admin@luongkun.io` / `123456`.

## Webhook đối soát

Trỏ cổng thanh toán (Casso/SePay) về:

```
POST https://salessuite.onrender.com/api/payments/webhook?api_key=3730daead355cca9864279e95bfe7fec
```

Body ví dụ: `{"content":"NAP100001","amount":50000,"id":"GD123"}` — nạp tiền hiện modal realtime.

## Giới hạn bản free (cần biết)

| Giới hạn | Tác động | Cách giảm tác động |
|---|---|---|
| **Sleep sau 15 phút không có request** | Lần mở tiếp theo chậm ~30-60s | Dùng UptimeRobot (free) ping URL mỗi 5-10 phút |
| **SQLite local không bền qua redeploy** (nếu KHÔNG bật Turso) | Số dư/đơn tạo sau khi deploy bị reset về dữ liệu trong repo | **Bật Turso theo mục dưới — dữ liệu bền vĩnh viễn, free 100%** |
| 750 giờ/tháng | Chạy 1 service 24/7 là đủ | — |

## 💾 DB bền vững qua redeploy — Turso (free 100%, Task 79+80 — ✅ ĐÃ BẬT)

✅ **Đã cấu hình và import dữ liệu xong (Task 80)** — không cần thao tác thêm:

- DB cloud: `libsql://sales-luongkun.aws-ap-northeast-1.turso.io` (Turso — Tokyo, free 9GB, không cần thẻ)
- Credentials: 2 biến `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN` nằm trong **`server/.env`** (đã commit) → Render tự đọc khi boot
- Dữ liệu baseline đã **import khớp 100% repo**: admin 8.407.499đ / 13 users / 8.019 orders / webhook secret `3730daead...` giữ nguyên
- Từ deploy này trở đi: mọi redeploy / sleep / restart — dữ liệu **NGUYÊN VẸN** trên Turso cloud

Chi tiết vận hành:

- **Render production**: boot đọc `.env` → nối Turso cloud. Muốn thay token sau này: set `LIBSQL_URL`/`LIBSQL_AUTH_TOKEN` trong Render Environment (process.env **ưu tiên hơn** .env), rồi xoá 2 dòng trong .env.
- **Sandbox/Preview Panel (Task 81 — CHẾ ĐỘ MẶC ĐỊNH: ĐỒNG BỘ với live)**: Express sandbox đọc .env → nối **cùng DB Turso** với Render → Preview Panel và live **dùng chung 1 dữ liệu thật** (ghi ở đâu cũng thấy ngay ở bên kia, zero delay):
  ```bash
  cd server && ( setsid nohup node src/index.js >> /tmp/server-3001.log 2>&1 < /dev/null & )
  ```
  ⚠️ Vì dùng chung DB production: thao tác trên Preview (đăng ký/nạp/mua) là THẬT — muốn test không dính dữ liệu thật, tạm chạy chế độ cách ly:
  ```bash
  cd server && ( LIBSQL_URL= LIBSQL_AUTH_TOKEN= setsid nohup node src/index.js >> /tmp/server-3001.log 2>&1 < /dev/null & )
  ```
  (empty override vô hiệu hoá .env vì dotenv không đè process.env đã set; nhớ chạy lại lệnh mặc định để trở về chế độ đồng bộ)
- 🔐 **Bảo mật**: repo đang public + token read-write trong .env → ai clone được repo đều đọc/ghi được DB. Khuyến nghị mạnh: **chuyển repo về private**, hoặc rotate token (`turso db tokens create sales-luongkun`) rồi set vào Render Environment thay vì .env.
- **DB trắng mới**: bỏ 2 dòng creds trong .env → boot tự tạo bảng + seed demo (admin/123456) — hành vi tự bootstrap vẫn giữ.
- Webhook secret giữ nguyên `3730daead...` (đã import baseline) — API key nạp tiền không đổi.

## Tuỳ chọn

- **Trợ lý AI (Lumi)** — Task 82: `z-ai-web-dev-sdk` mặc định trỏ `internal-api.z.ai` (IP private 172.25.x — CHỈ chạy trong sandbox Z.ai, **Render không với tới được** → lỗi "Trợ lý AI đang bận").
  Fix cho production: lấy **API key open platform** rồi set env `ZAI_API_KEY` (Render Environment hoặc `server/.env`):
  - Nguồn key: https://z.ai/api (quốc tế) hoặc https://open.bigmodel.cn (TQ) — bản free có GLM-4.5-Flash
  - Optional env: `ZAI_MODEL` (mặc định `glm-4.5-air`; có thể `glm-4.5-flash` free / `glm-4.6` tốt hơn), `ZAI_BASE_URL` (mặc định `https://api.z.ai/api/paas/v4`)
  - Set xong → /api/chat tự đổi sang public API (module `server/src/ai.js` 2 chế độ); sandbox không set key vẫn chạy SDK internal như cũ
- **Đổi JWT_SECRET**: render.yaml đang `generateValue: true` (Render tự sinh) — an toàn hơn mặc định.

## Chạy local chế độ deploy

```bash
cd server && npm install
DEPLOY=1 PORT=4000 npm start   # mở http://localhost:4000
```
> **Verify Task 80 (2026-09-08):** đã kiểm chứng trên live — nạp 60.000đ cho user test
> ghi thẳng vào Turso cloud, redeploy sau đó dữ liệu NGUYÊN VẸN (trước đây bị reset).
