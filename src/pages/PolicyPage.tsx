import { useState, useEffect, useRef } from 'react';
import { Check, Info, ScrollText } from 'lucide-react';
import { POLICY_SECTIONS, POLICY_UPDATED } from '../data/policy';
import AnimatedSection from '../components/AnimatedSection';

export default function PolicyPage() {
  const [activeId, setActiveId] = useState(POLICY_SECTIONS[0].id);
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Scroll spy: highlight mục đang xem trong index
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id.replace('policy-', ''));
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sectionsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`policy-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <AnimatedSection>
        <section className="relative overflow-hidden rounded-3xl border border-gray-200/70 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/60 p-8 lg:p-10">
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gray-300/20 dark:bg-gray-500/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center shadow-lg shadow-gray-700/30 flex-shrink-0">
              <ScrollText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Chính sách & Điều khoản
              </h2>
              <p className="mt-2 text-sm lg:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                Quy định mua hàng, giao thông tin sản phẩm, bảo hành hoàn tiền và
                các điều khoản sử dụng tại Sales Suite Pro.
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <Info className="w-3.5 h-3.5" />
                {POLICY_UPDATED} · Áp dụng cho mọi đơn hàng mới
              </p>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Index mục lục (desktop) */}
        <aside className="hidden lg:block">
          <nav
            className="sticky top-0 space-y-1"
            aria-label="Mục lục chính sách"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 px-3">
              Mục lục
            </p>
            {POLICY_SECTIONS.map((s) => {
              const active = activeId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    active
                      ? 'bg-gray-100 dark:bg-gray-700/60 font-semibold text-gray-800 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  aria-current={active ? 'true' : undefined}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                      active ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  <span className="truncate">{s.title.replace(/^\d+\.\s*/, '')}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Nội dung các mục */}
        <div className="lg:col-span-3 space-y-4">
          {POLICY_SECTIONS.map((s, i) => (
            <AnimatedSection key={s.id} delay={i * 40}>
              <section
                id={`policy-${s.id}`}
                ref={(el) => {
                  if (el) sectionsRef.current.set(s.id, el);
                }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-24"
                aria-labelledby={`policy-title-${s.id}`}
              >
                <h3
                  id={`policy-title-${s.id}`}
                  className="flex items-center gap-3 text-base font-bold text-gray-800 dark:text-white"
                >
                  <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-4.5 h-4.5" />
                  </span>
                  {s.title}
                </h3>

                {s.intro && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {s.intro}
                  </p>
                )}

                <ul className="mt-4 space-y-2.5">
                  {s.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                    >
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                {s.note && (
                  <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 leading-relaxed">
                      ⚠️ {s.note.replace('⚠️ ', '')}
                    </p>
                  </div>
                )}
              </section>
            </AnimatedSection>
          ))}

          <AnimatedSection>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
              Còn thắc mắc về điều khoản? Hỏi Chatbot AI trong nhóm Công cụ — hoặc
              liên hệ trực tiếp qua trang Hỗ trợ.
            </p>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
