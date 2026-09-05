import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Nhãn "Dữ liệu cập nhật" đồng bộ realtime với thời gian hiện tại:
 * - Tháng/năm luôn là tháng hiện tại (tự đổi khi sang tháng mới)
 * - Đồng hồ nhảy từng giây
 * - Chấm xanh nhấp nháy báo trạng thái realtime
 * - Mobile (<sm): dạng compact "Cập nhật: T9/2026 · 05:14"
 * - Desktop (≥sm): dạng đầy đủ "Dữ liệu cập nhật: Tháng 9, 2026 · 05:14:25"
 */
export default function LiveSyncLabel() {
  const { locale, t } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const monthFull =
    locale === 'vi'
      ? `Tháng ${month}, ${year}`
      : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);
  const monthShort =
    locale === 'vi'
      ? `T${month}/${year}`
      : new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(now);

  const clock = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  const clockShort = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  return (
    <p
      className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 min-w-0"
      title="Đồng bộ realtime với thời gian hiện tại"
    >
      <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>

      {/* Bản compact cho mobile */}
      <span className="sm:hidden whitespace-nowrap">
        {t('dashboard.updated_short', { month: monthShort })}
        <span className="mx-1" aria-hidden="true">·</span>
        <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{clockShort}</span>
      </span>

      {/* Bản đầy đủ cho desktop */}
      <span className="hidden sm:inline">
        {t('dashboard.updated', { month: monthFull })}
        <span className="mx-1" aria-hidden="true">·</span>
        <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{clock}</span>
      </span>
    </p>
  );
}
