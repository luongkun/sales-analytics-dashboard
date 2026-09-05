/**
 * useAnalytics — hook dùng chung cho mọi trang phân tích.
 *
 * Kiến trúc "cache dùng chung + realtime":
 *  - Dữ liệu fetch 1 lần, cache ở module-level; mọi instance mount sau dùng ngay
 *    cache (stale-while-revalidate: fetch ngầm để làm mới).
 *  - Khi có event realtime (đơn mới, user mới, admin sửa/xóa...) → debounce 600ms
 *    rồi load lại → toàn bộ instance đồng loạt nhận dữ liệu mới.
 *  - Tab trở lại focus → tự làm mới.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAnalytics, type AnalyticsPayload } from '../api/analytics';
import { onRealtime } from '../realtime/client';

type Listener = (data: AnalyticsPayload | null, error: Error | null) => void;

let cache: AnalyticsPayload | null = null;
let inflight: Promise<AnalyticsPayload> | null = null;
const listeners = new Set<Listener>();
let realtimeBound = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function notify(data: AnalyticsPayload | null, error: Error | null) {
  for (const fn of listeners) {
    try {
      fn(data, error);
    } catch {
      /* listener lỗi không ảnh hưởng listener khác */
    }
  }
}

async function load(force = false): Promise<AnalyticsPayload | null> {
  if (!force && cache) {
    // stale-while-revalidate: có cache thì dùng, ngầm fetch bản mới
    if (!inflight) loadFresh().catch(() => {});
    return cache;
  }
  return loadFresh();
}

async function loadFresh(): Promise<AnalyticsPayload> {
  if (inflight) return inflight;
  inflight = fetchAnalytics()
    .then((data) => {
      cache = data;
      inflight = null;
      notify(cache, null);
      return data;
    })
    .catch((err: Error) => {
      inflight = null;
      notify(cache, err);
      throw err;
    });
  return inflight;
}

function scheduleReload() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    loadFresh().catch(() => {});
  }, 600);
}

function bindRealtimeOnce() {
  if (realtimeBound) return;
  realtimeBound = true;
  onRealtime('users:changed', scheduleReload);
  onRealtime('order:created', scheduleReload);
  onRealtime('analytics:changed', scheduleReload);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleReload();
  });
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsPayload | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    bindRealtimeOnce();

    const listener: Listener = (d, err) => {
      if (!mounted.current) return;
      if (d) setData(d);
      if (err) setError(err);
      setLoading(false);
    };
    listeners.add(listener);

    load().catch((err: Error) => {
      if (mounted.current) {
        setError(err);
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      listeners.delete(listener);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}
