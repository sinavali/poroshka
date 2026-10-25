const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window === 'undefined' ? (process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000') : '');

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getClientUUID(): string {
  if (typeof window === 'undefined') return '';
  let uuid = localStorage.getItem('poroshka_client_uuid') || localStorage.getItem('promptjoo_client_uuid');
  if (!uuid || !UUID_V4_REGEX.test(uuid)) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      uuid = crypto.randomUUID();
    } else {
      uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem('poroshka_client_uuid', uuid);
    localStorage.setItem('promptjoo_client_uuid', uuid);
  }
  return uuid;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('poroshka_session_token') ||
    localStorage.getItem('promptjoo_session_token') ||
    localStorage.getItem('poroshka_admin_token') ||
    localStorage.getItem('promptjoo_admin_token')
  );
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
