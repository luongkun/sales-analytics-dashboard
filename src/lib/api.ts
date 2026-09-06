// ===== API client (khớp server Task-51, base /api, Bearer token) =====

const API_BASE = '/api';
const TOKEN_KEY = 'auth-token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ApiOpts {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function api<T = Record<string, unknown>>(path: string, opts: ApiOpts = {}): Promise<T> {
  const token = opts.auth === false ? null : getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError('Không thể kết nối tới máy chủ', 0);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError((json.error as string) || 'Có lỗi xảy ra, vui lòng thử lại', res.status);
  }
  return json as T;
}

export function errMessage(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) return e.message;
  return 'Không thể kết nối tới máy chủ';
}

/** copy clipboard + toast */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
