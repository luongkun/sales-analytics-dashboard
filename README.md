# Sales Suite Pro

Dashboard phân tích doanh thu realtime — doanh thu, đơn hàng, khách hàng, báo cáo, nạp tiền QR (VietQR / MoMo) + webhook cộng tiền tự động, đồng bộ realtime qua socket.io.

**Bản đang chạy (live):** https://salessuite.onrender.com

## 🚀 Chạy web chuẩn trên máy bạn (3 lệnh)

```bash
git clone https://github.com/luongkun/sales-analytics-dashboard.git
cd sales-analytics-dashboard
npm run dev
```

- Lần đầu chạy sẽ **tự cài dependencies** cho server (~1–2 phút).
- Mở **http://localhost:3001** → tự redirect sang `/app` → web **y hệt** https://salessuite.onrender.com
- Tài khoản demo: `admin@luongkun.io` / `123456`

Cách gọi trực tiếp tương đương: `cd server && DEPLOY=1 npm start`

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

## Cấu trúc repo

```
sales-analytics-dashboard/
├── scripts/serve.js        # npm run dev → chạy web chuẩn (DEPLOY=1, tự cài deps)
├── server/
│   ├── public/             # ⭐ WEB CHUẨN — bundle build sẵn (Render deploy từ đây)
│   ├── src/                # backend Express (API + auth + webhook + realtime)
│   └── src/data/app.db     # SQLite seed (deploy lại Render sẽ reset DB về file này)
├── restore-all.sh          # khôi phục 1 lệnh sau reset môi trường
├── render.yaml             # Render blueprint (free)
└── DEPLOY.md               # hướng dẫn deploy Render chi tiết
```

## Lưu ý quan trọng

- **Web chuẩn = bundle build sẵn trong `server/public/`** — mọi tính năng mới nhất (NAP_ID, modal "Nạp tiền thành công" realtime, thông báo chuông, icon brand) đều nằm trong bundle này.
- **KHÔNG build lại web từ nguồn khác** — bundle hiện tại là bản chuẩn duy nhất; build lại từ source khác sẽ tạo ra giao diện lệch bản chuẩn.
- Muốn sửa web: vá trực tiếp bundle trong `server/public/` rồi push (Render tự deploy).
- Deploy: push lên `main` → Render tự deploy lại; SQLite reset về `server/src/data/app.db` mỗi lần deploy.

## Deploy Render

Xem **DEPLOY.md** — free plan, 1 process duy nhất (web + API + realtime + webhook), không cần thẻ ngân hàng.
