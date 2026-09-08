# Sales Suite Pro

Dashboard phân tích doanh thu realtime — doanh thu, đơn hàng, khách hàng, báo cáo, nạp tiền QR (VietQR / MoMo) + webhook cộng tiền tự động, đồng bộ realtime qua socket.io.

**Bản đang chạy (live):** https://salessuite.onrender.com

---

## ⚠️ Web chuẩn nằm ở đâu? (đọc trước khi chạy)

Repo có **2 phần frontend** — chỉ 1 trong 2 là web chuẩn:

| Thư mục | Là gì | Dùng để |
|---|---|---|
| `server/public/` | **WEB CHUẨN** — bundle đã build sẵn (`assets/index-BO8pxDQf.js`), giống hệt web trên Render 100% | **Chạy & deploy** |
| `src/` | Bản source **tái dựng** (để đọc hiểu code; giao diện chi tiết KHÔNG giống web chuẩn) | Chỉ đọc — **KHÔNG build/deploy từ đây**, vì build ra sẽ khác giao diện web chuẩn |

> Lịch sử: source gốc bị mất trong một lần reset môi trường — web chuẩn vẫn sống nguyên vẹn trong bundle build sẵn. Mọi tính năng mới nhất (NAP_ID, modal "Nạp tiền thành công" realtime, thông báo chuông, icon brand) đều đã nằm trong bundle này.

---

## 🚀 Chạy web chuẩn trên máy bạn

```bash
git clone https://github.com/luongkun/sales-analytics-dashboard.git
cd sales-analytics-dashboard
npm run dev
```

- Lần đầu chạy sẽ **tự cài dependencies** cho server (~1–2 phút).
- Mở **http://localhost:3001** → tự redirect sang `/app` → web **y hệt** https://salessuite.onrender.com
- Tài khoản demo: `admin@luongkun.io` / `123456`

Cách gọi trực tiếp tương đương: `cd server && DEPLOY=1 npm start`

> ℹ️ `npm run dev` / `npm start` đều chạy bundle chuẩn trong `server/public/`.
> `npx vite` (nếu muốn) chỉ chạy bản source tái dựng `src/` — giao diện sẽ khác web chuẩn, và cần backend 3001 chạy sẵn.

---

## Kiểm thử webhook nạp tiền (tiền tự cộng + modal realtime)

```bash
curl -X POST "http://localhost:3001/api/payments/webhook?api_key=3730daead355cca9864279e95bfe7fec" \
  -H "Content-Type: application/json" \
  -d '{"content":"chuyen tien NAP100001", "amount":30000, "id":"TEST-01"}'
```

- Nội dung chuyển khoản phải chứa mã NAP của tài khoản (NAP100001 = admin).
- `amount` là số tiền (đơn vị đồng) — field riêng, không parse từ nội dung.
- `id` là mã tham chiếu duy nhất — bắn lại cùng `id` sẽ bị bỏ qua (idempotent).
- Nếu đang đăng nhập trong web: modal **"Nạp tiền thành công"** tự bật ngay (số tiền / thưởng / số dư mới) + thông báo trong chuông.

---

## Cấu trúc repo

```
sales-analytics-dashboard/
├── scripts/serve.js        # npm run dev → chạy web chuẩn (DEPLOY=1)
├── src/                    # source tái dựng (đọc hiểu — không dùng để deploy)
├── server/
│   ├── public/             # ⭐ WEB CHUẨN — bundle build sẵn (deploy lên Render từ đây)
│   ├── src/                # backend Express (API + auth + webhook + realtime)
│   └── src/data/app.db     # SQLite seed (deploy lại Render sẽ reset DB về file này)
├── restore-all.sh          # khôi phục 1 lệnh sau reset môi trường
├── render.yaml             # Render blueprint (free)
└── DEPLOY.md               # hướng dẫn deploy Render chi tiết
```

## Deploy

Xem **DEPLOY.md** — Render free, 1 process duy nhất (web + API + realtime), push lên `main` là tự deploy lại.

> Render free plan: service ngủ sau 15 phút không có request (mở lại mất ~30–60s); SQLite reset về `server/src/data/app.db` mỗi lần deploy lại.
