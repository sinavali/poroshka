const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window === 'undefined' ? (process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000') : '');

export function getClientUUID(): string {
  if (typeof window === 'undefined') return '';
  let uuid = localStorage.getItem('promptjoo_client_uuid');
  if (!uuid) {
    uuid = 'c_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('promptjoo_client_uuid', uuid);
  }
  return uuid;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('promptjoo_session_token') || localStorage.getItem('promptjoo_admin_token');
}

export async function fetchFromApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const clientUuid = getClientUUID();
  if (clientUuid) {
    headers.set('X-Client-UUID', clientUuid);
  }

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `API Error: ${res.status}`);
  }

  return res.json();
}
