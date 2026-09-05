import { useState } from 'react';
import {
  Headset,
  Copy,
  Check,
  Clock,
  Zap,
  ChevronDown,
  MessageCircleQuestion,
} from 'lucide-react';
import { SUPPORT_CONTACTS, SUPPORT_HOURS, SUPPORT_FAQ } from '../data/support';
import AnimatedSection from '../components/AnimatedSection';

export default function SupportPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      // Clipboard bị chặn (iframe lạ) — chọn text thủ công vẫn được
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <AnimatedSection>
        <section className="relative overflow-hidden rounded-3xl border border-emerald-200/60 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/5 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-cyan-500/5 p-8 lg:p-10">
          <div
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-400/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <Headset className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Trung tâm Hỗ trợ
              </h2>
              <p className="mt-2 text-sm lg:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                Gặp vấn đề với đơn hàng, thanh toán hay tài khoản? Liên hệ ngay —
                tôi luôn sẵn sàng giải đáp và xử lý nhanh nhất có thể.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-800/60 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <Zap className="w-3.5 h-3.5" />
                  Phản hồi nhanh
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                  <Clock className="w-3.5 h-3.5" />
                  {SUPPORT_HOURS.schedule}
                </span>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ── Thông tin liên hệ ────────────────────────────────── */}
      <AnimatedSection delay={80}>
        <section aria-labelledby="contact-heading" className="mt-6">
          <h3
            id="contact-heading"
            className="text-sm font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3"
          >
            Thông tin liên hệ
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPPORT_CONTACTS.map((c) => {
              const isCopied = copiedId === c.id;
              return (
                <div
                  key={c.id}
                  className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg} ${c.iconColor}`}
                    >
                      <c.icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      {c.label}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <p className="text-base font-bold text-gray-800 dark:text-white truncate">
                      {c.value}
                    </p>
                    <button
                      onClick={() => handleCopy(c.id, c.value)}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        isCopied
                          ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      aria-label={`Sao chép ${c.label}`}
                      title={`Sao chép ${c.label}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Đã sao chép
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Sao chép
                        </>
                      )}
                    </button>
                  </div>
                  {c.note && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                      {c.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </AnimatedSection>

      {/* ── Cam kết + FAQ ────────────────────────────────────── */}
      <AnimatedSection delay={140}>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Cam kết */}
          <section
            aria-labelledby="commitment-heading"
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 self-start"
          >
            <h3
              id="commitment-heading"
              className="text-base font-bold text-gray-800 dark:text-white"
            >
              Cam kết hỗ trợ
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                SUPPORT_HOURS.responseTime,
                'Đơn "Đang xử lý" được gửi thông tin ngay khi sẵn sàng — bạn không cần chờ hỏi lại',
                'Sản phẩm lỗi: hoàn tiền 100% về số dư trong 24 giờ',
              ].map((text, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                >
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-400/10 dark:to-teal-400/5 border border-emerald-100 dark:border-emerald-500/20 p-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                💡 Mẹo: luôn gửi kèm mã đơn hàng (ORD-XXXXXX) khi liên hệ để được
                xử lý ưu tiên.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section
            aria-labelledby="faq-heading"
            className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 self-start"
          >
            <h3
              id="faq-heading"
              className="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-white"
            >
              <MessageCircleQuestion className="w-5 h-5 text-emerald-500" />
              Câu hỏi thường gặp
            </h3>
            <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700/60">
              {SUPPORT_FAQ.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-3 py-3.5 text-left group"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pb-3.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed animate-fade-in">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </AnimatedSection>
    </div>
  );
}
