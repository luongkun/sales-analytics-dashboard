# Deploy miễn phí lên Render.com (*.onrender.com)

App chạy **1 process tự chủ**: Express serve web tĩnh + API + realtime socket.io cùng một port —
không cần Next.js wrapper, không cần Caddy gateway. Chỉ bật khi env `DEPLOY=1`.

## Triển khai (3 phút, 0đ, không cần thẻ ngân hàng)

1. Vào **https://dashboard.render.com** → đăng ký bằng tài khoản GitHub của bạn (luongkun).
2. **New → Blueprint** → chọn repo `sales-analytics-dashboard` → Render tự đọc `render.yaml` → **Apply**.
3. Chờ build ~2-3 phút → mở URL `https://sales-analytics-dashboard.onrender.com`.

Đăng nhập demo: `admin@luongkun.io` / `123456`.

## Webhook đối soát

Trỏ cổng thanh toán (Casso/SePay) về:

```
POST https://<tên-app>.onrender.com/api/payments/webhook?api_key=3730daead355cca9864279e95bfe7fec
```

Body ví dụ: `{"content":"NAP100001","amount":50000,"id":"GD123"}` — nạp tiền hiện modal realtime.

## Giới hạn bản free (cần biết)

| Giới hạn | Tác động | Cách giảm tác động |
|---|---|---|
| **Sleep sau 15 phút không có request** | Lần mở tiếp theo chậm ~30-60s | Dùng UptimeRobot (free) ping URL mỗi 5-10 phút |
| **SQLite không bền vững qua mỗi lần deploy** | Số dư/đơn tạo sau khi deploy bị reset về dữ liệu trong repo | Đây là app demo — chấp nhận được; muốn bền: nâng plan có disk hoặc chuyển Postgres |
| 750 giờ/tháng | Chạy 1 service 24/7 là đủ | — |

## Tuỳ chọn

- **Chatbot AI Lumi**: đặt env `ZAI_API_KEY` (và các env SDK z-ai-web-dev-sdk yêu cầu) trong Render → mục Environment.
- **Đổi JWT_SECRET**: render.yaml đang `generateValue: true` (Render tự sinh) — an toàn hơn mặc định.

## Chạy local chế độ deploy

```bash
cd server && npm install
DEPLOY=1 PORT=4000 npm start   # mở http://localhost:4000
```
