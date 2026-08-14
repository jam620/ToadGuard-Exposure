import type { Role } from '../../types';

import { useCallback, useEffect, useState } from 'react';

import { clearToken, setToken } from '../api-client';

interface AuthState {
  userId: string | null;
  email: string | null;
  roles: Role[];
  isAuthenticated: boolean;
}

function parseToken(token: string): AuthState | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub: string;
      email: string;
      roles: Role[];
      exp: number;
    };
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      isAuthenticated: true,
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    userId: null,
    email: null,
    roles: [],
    isAuthenticated: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem('toadguard_token');
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    const token = urlToken ?? stored;
    if (token) {
      const parsed = parseToken(token);
      if (parsed) {
        setToken(token);
        setAuth(parsed);
        if (urlToken) {
          const clean = new URL(window.location.href);
          clean.searchParams.delete('token');
          window.history.replaceState({}, '', clean.toString());
        }
      }
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuth({ userId: null, email: null, roles: [], isAuthenticated: false });
    window.location.href = '/login';
  }, []);

  return { ...auth, logout };
}
