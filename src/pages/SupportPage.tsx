import { useState } from 'react';
import { ChevronDown, Copy, Facebook, Globe, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { copyText } from '../lib/api';
import { FAQ_ITEMS, SUPPORT_CHANNELS } from '../data/static';
import { MiniCart } from '../components/MiniCart';

const CHANNEL_ICONS = {
  phone: Phone,
  'message-circle': MessageCircle,
  send: Send,
  mail: Mail,
  facebook: Facebook,
  globe: Globe,
} as const;

export function SupportPage() {
  const toast = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const doCopy = async (value: string, label: string) => {
    const ok = await copyText(value);
    if (ok) toast.showToast({ type: 'success', title: 'Đã sao chép', message: label });
    else toast.showToast({ type: 'error', title: 'Không thể sao chép' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="card-lift bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/50 dark:border-indigo-500/20 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Trung tâm Hỗ trợ</h2>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Gặp vấn đề với đơn hàng, thanh toán hay tài khoản? Liên hệ ngay — tôi luôn sẵn sàng giải đáp và xử lý nhanh nhất có thể.
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Phản hồi nhanh
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">⏰ 8:00 — 22:00 (T2 → CN)</span>
        </div>
      </div>

      {/* Contact channels */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">Thông tin liên hệ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUPPORT_CHANNELS.map((ch) => {
            const Icon = CHANNEL_ICONS[ch.icon];
            return (
              <div key={ch.id} className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                {ch.image ? (
                  <img src={ch.image} alt={`Logo ${ch.label}`} className="w-10 h-10 rounded-xl object-contain bg-white p-1 ring-1 ring-gray-100 dark:ring-gray-700 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">{ch.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{ch.value}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{ch.note}</p>
                </div>
                <button
                  onClick={() => doCopy(ch.value, ch.label)}
                  aria-label={`Sao chép ${ch.label}`}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700/60 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex-shrink-0"
                >
                  <Copy size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cam kết */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Cam kết hỗ trợ</h3>
        <ul className="mt-3 space-y-2.5">
          {[
            'Phản hồi trong vòng 5 phút trong giờ làm việc',
            'Đơn "Đang xử lý" được gửi thông tin ngay khi sẵn sàng — bạn không cần chờ hỏi lại',
            'Sản phẩm lỗi: hoàn tiền 100% về số dư trong 24 giờ',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-4.5 h-4.5 mt-0.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-[10px]">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-start gap-2.5">
          <span className="text-sm">💡</span>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            <b>Mẹo:</b> luôn gửi kèm mã đơn hàng (ORD-XXXXXX) khi liên hệ để được xử lý ưu tiên.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Câu hỏi thường gặp</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {FAQ_ITEMS.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">{f.q}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 animate-fade-in">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <MiniCart />
    </div>
  );
}
