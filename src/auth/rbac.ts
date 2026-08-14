import type { Role } from '../types';

export const ROLES = {
  ADMIN: 'ADMIN',
  ANALYST: 'ANALYST',
  VIEWER: 'VIEWER',
} as const satisfies Record<string, Role>;

const PERMISSION_MATRIX: Record<string, Role[]> = {
  'leaks:read': ['ADMIN', 'ANALYST', 'VIEWER'],
  'alerts:read': ['ADMIN', 'ANALYST', 'VIEWER'],
  'alerts:write': ['ADMIN', 'ANALYST'],
  'enrich:execute': ['ADMIN', 'ANALYST'],
  'config:read': ['ADMIN', 'ANALYST'],
  'config:write': ['ADMIN'],
  'webhooks:read': ['ADMIN', 'ANALYST'],
  'webhooks:write': ['ADMIN'],
  'users:read': ['ADMIN'],
  'users:write': ['ADMIN'],
};

export function hasPermission(roles: Role[], permission: string): boolean {
  const allowed = PERMISSION_MATRIX[permission] ?? [];
  return roles.some((r) => allowed.includes(r));
}

export function hasRole(userRoles: Role[], required: Role[]): boolean {
  return required.some((r) => userRoles.includes(r));
}
