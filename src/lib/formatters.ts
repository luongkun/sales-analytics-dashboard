// Bo dấu tiếng Việt cho search không dấu
export function stripDiacritics(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

// ===== Formatters (khớp bundle gốc) =====

/** Compact: 1,6 tỷ / 8,6 triệu / 20.000 */
export function formatCompact(x: number): string {
  if (x >= 1e9) return `${(x / 1e9).toFixed(1)} tỷ`;
  if (x >= 1e6) return `${(x / 1e6).toFixed(0)} triệu`;
  return new Intl.NumberFormat('vi-VN').format(x);
}

/** Intl vi-VN: 7.384.499 */
export function formatVND(x: number): string {
  return new Intl.NumberFormat('vi-VN').format(x);
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** dd/mm/yyyy */
export function formatDate(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Parse ISO/epoch -> dd/mm/yyyy */
export function isoToDate(input: string | number): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "Hôm nay · HH:mm" | "Hôm qua · HH:mm" | "dd/mm/yyyy · HH:mm" */
export function formatDateTime(ts: number | string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (sameDay) return `Hôm nay · ${time}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return `Hôm qua · ${time}`;
  }
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} · ${time}`;
}

/** full: dd/mm/yyyy · HH:mm */
export function formatFull(ts: number | string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} · ${time}`;
}

/** "HH:mm:ss d/m/yyyy" cho bảng admin payments */
export function formatTimeFull(ts: number): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return `${d.toLocaleTimeString('vi-VN', { hour12: false })} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** countdown "m:ss" */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

/** "Tháng 9, 2026" style header */
export function currentMonthLabel(): string {
  const d = new Date();
  return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

/** initials từ 2 chữ cuối tên: "Luong Kun" -> "LK" */
export function initialsOf(name: string): string {
  const parts = (name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(-2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Relative: "9 phút trước" */
export function formatRelative(minutesAgo: number): string {
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  if (minutesAgo < 60) return rtf.format(-minutesAgo, 'minute');
  if (minutesAgo < 1440) return rtf.format(-Math.round(minutesAgo / 60), 'hour');
  return rtf.format(-Math.round(minutesAgo / 1440), 'day');
}

/** YAxis chart: 55tr */
export function yAxisCompact(v: number): string {
  return `${(v / 1e6).toFixed(0)}tr`;
}
