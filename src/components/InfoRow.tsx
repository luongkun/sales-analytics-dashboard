import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  copy?: string;
  copyLabel?: string;
  highlight?: boolean;
}

export function InfoRow({ label, value, copy, copyLabel, highlight }: InfoRowProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    if (!copy) return;
    const ok = await copyText(copy);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.showToast({ type: 'success', title: `Đã sao chép ${copyLabel || label.toLowerCase()}` });
    } else {
      toast.showToast({ type: 'error', title: 'Không thể sao chép' });
    }
  };
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl ${
        highlight ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/30' : 'bg-gray-50 dark:bg-gray-700/40'
      }`}
    >
      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm font-semibold text-gray-900 dark:text-gray-100 truncate ${highlight ? 'font-mono' : ''}`}>{value}</span>
        {copy && (
          <button
            onClick={doCopy}
            aria-label={`Sao chép ${label.toLowerCase()}`}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
