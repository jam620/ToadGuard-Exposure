const BASE = import.meta.env['VITE_API_BASE_URL'] ?? '';

function getToken(): string | null {
  return localStorage.getItem('toadguard_token');
}

export function setToken(token: string): void {
  localStorage.setItem('toadguard_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('toadguard_token');
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, { ...init, headers });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const err = (await response.json().catch(() => ({ detail: response.statusText }))) as {
      detail: string;
    };
    throw new Error(err.detail ?? 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
