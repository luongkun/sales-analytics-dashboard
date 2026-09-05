import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';

/**
 * Nhãn "Dữ liệu cập nhật" đồng bộ realtime:
 * - Tháng/năm luôn là tháng hiện tại (tự đổi khi sang tháng mới)
 * - Chấm xanh nhấp nháy báo trạng thái realtime
 * - Mobile (<sm): dạng compact "Cập nhật: T9/2026"
 * - Desktop (≥sm): dạng đầy đủ "Dữ liệu cập nhật: Tháng 9, 2026"
 */
export default function LiveSyncLabel() {
  const { locale, t } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Chỉ cần lướt theo phút để đổi tháng khi sang tháng mới — không có đồng hồ giây
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
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

  return (
    <p
      className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 min-w-0"
      title="Đồng bộ realtime"
    >
      <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>

      {/* Bản compact cho mobile */}
      <span className="sm:hidden whitespace-nowrap">
        {t('dashboard.updated_short', { month: monthShort })}
      </span>

      {/* Bản đầy đủ cho desktop */}
      <span className="hidden sm:inline">
        {t('dashboard.updated', { month: monthFull })}
      </span>
    </p>
  );
}
