// ===== Analytics cache module-level (fetch dedupe + realtime refresh + hook) =====
import { useEffect, useState } from 'react';
import { api } from './api';
import { subscribe } from '../realtime/client';
import type { Analytics, DailyPoint } from './types';

let cache: Analytics | null = null;
let inflight: Promise<Analytics> | null = null;
let lastFetch = 0;
const CACHE_MS = 15_000;

export function fetchAnalytics(force = false): Promise<Analytics> {
  if (!force && cache && Date.now() - lastFetch < CACHE_MS) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = api<Analytics>('/analytics')
    .then((d) => {
      cache = d;
      lastFetch = Date.now();
      return d;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function getAnalyticsCache(): Analytics | null {
  return cache;
}

export async function fetchDaily(month: string): Promise<DailyPoint[]> {
  const res = await api<DailyPoint[] | { daily: DailyPoint[] }>(`/analytics/daily?month=${encodeURIComponent(month)}`);
  // server trả bare array (Task-51), fallback .daily cho backend cũ
  if (Array.isArray(res)) return res;
  return res.daily || [];
}

// Debounced realtime refresh
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<() => void>();
function notify() {
  for (const fn of subscribers) fn();
}
function debouncedRefresh(delay = 600) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchAnalytics(true).then(notify).catch(() => {});
  }, delay);
}

let subscribedRealtime = false;
function ensureRealtimeSubscribed() {
  if (subscribedRealtime) return;
  subscribedRealtime = true;
  subscribe('analytics:changed', () => debouncedRefresh());
  subscribe('users:changed', () => debouncedRefresh());
  subscribe('order:created', () => debouncedRefresh(400));
  subscribe('order:updated', () => debouncedRefresh(400));
}

export function useAnalytics() {
  const [data, setData] = useState<Analytics | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    ensureRealtimeSubscribed();
    const un = subscribe('analytics:refresh-local', () => setRefreshTick((t) => t + 1));
    const unsub = () => {
      subscribers.delete(handle);
      un();
    };
    function handle() {
      setRefreshTick((t) => t + 1);
    }
    subscribers.add(handle);
    let alive = true;
    setLoading(true);
    fetchAnalytics()
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message || 'Không tải được dữ liệu phân tích');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    const onVisible = () => {
      if (document.visibilityState === 'visible') setRefreshTick((t) => t + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
    };
  }, [refreshTick]);

  const refresh = () => setRefreshTick((t) => t + 1);
  return { data, loading, error, refresh };
}

// Gọi từ nơi khác (vd sau placeOrder) — ép refetch toàn app
export function analyticsLocalRefresh() {
  for (const fn of subscribers) fn();
}
