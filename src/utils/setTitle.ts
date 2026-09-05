/**
 * Đặt tiêu đề tab trình duyệt.
 * Khi app chạy trong iframe cùng origin (kiểu preview/preview panel),
 * tiêu đề tab lấy từ document của trang CHA → phải lan lên cả hai.
 *
 * Lưu ý: trang cha (Next.js dev) thi thoảng Fast Refresh và reset title tĩnh
 * của nó → gắn bộ tự khẳng định lại mỗi 5s để tab luôn giữ đúng tiêu đề app.
 */
let lastTitle = '';
let assertTimer: ReturnType<typeof setInterval> | null = null;

export function setAppTitle(title: string): void {
  lastTitle = title;
  try {
    document.title = title;
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) {
      window.parent.document.title = title;
      if (!assertTimer) {
        assertTimer = setInterval(() => {
          try {
            if (window.parent && window.parent !== window && window.parent.document.title !== lastTitle) {
              window.parent.document.title = lastTitle;
            }
          } catch {
            /* iframe khác origin — dừng */
            if (assertTimer) {
              clearInterval(assertTimer);
              assertTimer = null;
            }
          }
        }, 5000);
      }
    }
  } catch {
    /* iframe khác origin — bỏ qua */
  }
}
