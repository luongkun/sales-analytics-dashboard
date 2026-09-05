const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'auth-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || 'Có lỗi xảy ra, vui lòng thử lại', res.status);
  }
  return data as T;
}
