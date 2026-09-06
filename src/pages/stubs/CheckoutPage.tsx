/**
 * CheckoutPage (stub) — phase 2 sẽ dựng full: QR VietQR + đơn hàng +
 * success screen. Stub nhận onBack (Escape → products).
 */

import { ArrowLeft } from 'lucide-react';
import PageStub from './PageStub';

export default function CheckoutPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        <span>Quay lại</span>
      </button>
      <PageStub title="Thanh toán" />
    </div>
  );
}
