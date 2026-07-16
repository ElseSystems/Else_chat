const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  tenant?: { id: string; name: string; slug: string } | null;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('elsechat_token');
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem('elsechat_token', token);
  localStorage.setItem('elsechat_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('elsechat_token');
  localStorage.removeItem('elsechat_user');
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('elsechat_user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export function mediaUrl(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}

export { API_URL };
