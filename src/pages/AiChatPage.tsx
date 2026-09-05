import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, RotateCcw, Sparkles, User as UserIcon, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import AnimatedSection from '../components/AnimatedSection';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time: number;
  error?: boolean;
}

const SESSION_KEY = 'ai-chat-session';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    'Chào bạn 👋 Mình là **Lumi** — trợ lý AI của shop!\n\nMình có thể giải đáp về đơn hàng, trạng thái "Đang xử lý / Hoàn thành", nạp số dư, hạng VIP, bảo hành hoàn tiền… Bạn cứ hỏi nhé!',
  time: 0,
};

const SUGGESTIONS = [
  'Đơn "Đang xử lý" là gì vậy?',
  'Sao nạp số dư lên VIP?',
  'Sản phẩm lỗi thì bảo hành sao?',
  'Làm sao xem đơn đã mua?',
];

/** Render text thô: xuống dòng + **bold** đơn giản */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 w-fit" aria-label="AI đang nhập">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function AiChatPage() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Khôi phục lịch sử hội thoại từ server (lưu DB — còn mãi khi restart/đổi thiết bị)
  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ success: boolean; messages: { role: 'user' | 'assistant'; content: string; createdAt: number }[] }>(
          `/chat?sessionId=${encodeURIComponent(id)}`
        );
        if (cancelled) return;
        if (res.messages && res.messages.length > 0) {
          setMessages(res.messages.map((m) => ({ role: m.role, content: m.content, time: m.createdAt })));
        }
      } catch {
        // Không tải được lịch sử → bắt đầu với greeting mới
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tự cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || sending) return;
      setInput('');
      setMessages((prev) => [...prev, { role: 'user', content: text, time: Date.now() }]);
      setSending(true);
      try {
        const res = await api<{ success: boolean; response: string }>('/chat', {
          method: 'POST',
          body: { sessionId: sessionId || getSessionId(), message: text },
        });
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.response, time: Date.now() },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: msg, time: Date.now(), error: true },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [input, sending, sessionId]
  );

  const resetChat = async () => {
    const id = sessionId || getSessionId();
    try {
      await api(`/chat/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Xóa phía server fail vẫn reset UI được
    }
    setMessages([GREETING]);
    setInput('');
    showToast({ type: 'success', title: 'Đã tạo hội thoại mới', message: 'Lumi đã quên cuộc trò chuyện trước đó' });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatedSection>
        <section
          className="rounded-3xl border border-violet-200/60 dark:border-violet-500/20 bg-white dark:bg-gray-800 overflow-hidden shadow-xl shadow-violet-500/5 flex flex-col"
          style={{ height: 'calc(100vh - 13rem)', minHeight: '420px' }}
          aria-labelledby="chat-title"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-500/15 dark:via-purple-500/10 dark:to-fuchsia-500/5 border-b border-violet-100 dark:border-violet-500/20 px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800"
                  title="Trực tuyến"
                />
              </div>
              <div className="min-w-0">
                <h2
                  id="chat-title"
                  className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2"
                >
                  Trợ lý AI Lumi
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
                    AI
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {sending ? 'Đang soạn tin nhắn…' : 'Trực tuyến · trả lời ngay'}
                </p>
              </div>
            </div>
            <button
              onClick={resetChat}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Trò chuyện mới"
              title="Bắt đầu cuộc trò chuyện mới"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trò chuyện mới</span>
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-gray-50/60 dark:bg-gray-900/20"
            role="log"
            aria-label="Hội thoại với trợ lý AI"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {m.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20">
                    {m.error ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-br-md shadow-md shadow-violet-500/20'
                      : m.error
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-500/20 rounded-bl-md'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md shadow-sm'
                  }`}
                >
                  <RichText text={m.content} />
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-end gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Đang khôi phục lịch sử */}
            {loadingHistory && (
              <div className="flex items-center gap-2 px-2 py-4 text-sm text-gray-400 dark:text-gray-500">
                <RotateCcw className="w-4 h-4 animate-spin" />
                Đang tải lịch sử hội thoại…
              </div>
            )}

            {/* Gợi ý câu hỏi khi chưa hỏi gì */}
            {!loadingHistory && messages.length === 1 && !sending && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">
                  Câu hỏi phổ biến — bấm để hỏi ngay:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs font-medium px-3.5 py-2 rounded-full bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ô nhập */}
          <div className="flex-shrink-0 border-t border-violet-100 dark:border-violet-500/20 bg-white dark:bg-gray-800 px-3 sm:px-4 py-3">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Nhập câu hỏi… (Enter để gửi)"
                aria-label="Tin nhắn gửi trợ lý AI"
                className="flex-1 resize-none max-h-32 bg-gray-100 dark:bg-gray-700/60 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-violet-500/40 transition-shadow custom-scrollbar"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all"
                aria-label="Gửi tin nhắn"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 text-center">
              Lumi là AI — với đơn hàng/hoàn tiền cụ thể, hãy liên hệ hỗ trợ kèm mã đơn
            </p>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
}
