import { useEffect, useRef, useState } from 'react';
import { Bot, RotateCcw, Send } from 'lucide-react';
import { api, errMessage } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import type { ChatMessage } from '../lib/types';

const SUGGESTIONS = [
  'Đơn "Đang xử lý" là gì vậy?',
  'Sao nạp số dư lên VIP?',
  'Sản phẩm lỗi thì bảo hành sao?',
  'Làm sao xem đơn đã mua?',
];

const WELCOME = 'Chào bạn 👋 Mình là **Lumi** — trợ lý AI của shop!\n\nMình có thể giải đáp về đơn hàng, trạng thái "Đang xử lý / Hoàn thành", nạp số dư, hạng VIP, bảo hành hoàn tiền… Bạn cứ hỏi nhé!';

function renderContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  );
}

export function AiChatPage() {
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('ai-chat-session');
    if (!id) {
      id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('ai-chat-session', id);
    }
    return id;
  });
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ messages: ChatMessage[] }>(`/chat?sessionId=${encodeURIComponent(sessionId)}`)
      .then((d) => setMessages(d.messages || []))
      .catch(() => setMessages([]));
  }, [sessionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);
    const userMsg: ChatMessage = { role: 'user', content, createdAt: Date.now() };
    setMessages((cur) => [...(cur || []), userMsg]);
    try {
      const d = await api<{ response: string }>('/chat', { method: 'POST', body: { sessionId, message: content } });
      setMessages((cur) => [...(cur || []), { role: 'assistant', content: d.response, createdAt: Date.now() }]);
    } catch (e) {
      setMessages((cur) => [...(cur || []), { role: 'assistant', content: errMessage(e), createdAt: Date.now() }]);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await api(`/chat/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      setMessages([]);
    } catch {
      setMessages([]);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Bot size={20} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Trợ lý AI Lumi</h2>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-300">AI</span>
          </div>
          <p className="text-xs text-emerald-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {sending ? 'Đang soạn tin nhắn…' : 'Trực tuyến · trả lời ngay'}
          </p>
        </div>
        <button
          onClick={reset}
          disabled={resetting}
          aria-label="Trò chuyện mới"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} /> Trò chuyện mới
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar mt-4 space-y-4 py-2">
        {messages === null ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Đang tải lịch sử hội thoại…</p>
            </div>
          </div>
        ) : (
          <>
            <Bubble role="assistant" content={WELCOME} time={''} />
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} time={formatDateTime(m.createdAt).replace('Hôm nay · ', '')} />
            ))}
            {sending && (
              <div className="flex items-center gap-1.5 pl-2">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Suggestions */}
      {messages?.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="px-3.5 py-2 rounded-full text-xs font-medium bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-end gap-2.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Nhập câu hỏi… (Enter để gửi)"
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400 max-h-32 custom-scrollbar"
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            aria-label="Gửi tin nhắn"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 disabled:opacity-50 flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-gray-400">Lumi là AI — với đơn hàng/hoàn tiền cụ thể, hãy liên hệ hỗ trợ kèm mã đơn</p>
      </div>
    </div>
  );
}

function Bubble({ role, content, time }: { role: 'user' | 'assistant'; content: string; time: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md shadow-lg shadow-indigo-500/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderContent(content)}</p>
        {time && <p className={`mt-1 text-[10px] ${isUser ? 'text-white/60' : 'text-gray-400'}`}>{time}</p>}
      </div>
    </div>
  );
}
