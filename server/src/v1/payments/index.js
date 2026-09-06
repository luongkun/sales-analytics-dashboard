/**
 * v1/payments/index.js — Router API thanh toán QR động
 *
 * Mount tại: app.use('/api/v1/payments', createPaymentsRouter({ auth }))
 * (auth được tiêm từ server index.js — tránh circular import)
 *
 * Routes:
 *   POST /orders                  tạo đơn + QR (JWT)
 *   GET  /orders                  lịch sử đơn (JWT)
 *   GET  /orders/:code            trạng thái đơn (JWT) — cho polling
 *   POST /orders/:code/simulate   mô phỏng bank gửi webhook (JWT, demo)
 *   GET  /webhook                 mô tả hợp đồng chữ ký
 *   POST /webhook                 receiver từ cổng thanh toán (HMAC, KHÔNG JWT)
 */
import { Router } from 'express';
import * as controller from './payment.controller.js';

export function createPaymentsRouter({ auth }) {
  const router = Router();

  router.get('/webhook', controller.webhookInfo);
  router.post('/webhook', controller.receiveWebhook);

  router.post('/orders', auth, controller.createOrder);
  router.get('/orders', auth, controller.listOrders);
  router.get('/orders/:code', auth, controller.getOrder);
  router.post('/orders/:code/simulate', auth, controller.simulateOrder);

  return router;
}
