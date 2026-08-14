import { describe, expect, it } from 'vitest';

import { hasPermission, hasRole } from '../rbac';

describe('hasPermission', () => {
  it('ADMIN can write config', () => {
    expect(hasPermission(['ADMIN'], 'config:write')).toBe(true);
  });

  it('VIEWER cannot write config', () => {
    expect(hasPermission(['VIEWER'], 'config:write')).toBe(false);
  });

  it('ANALYST can read leaks', () => {
    expect(hasPermission(['ANALYST'], 'leaks:read')).toBe(true);
  });

  it('returns false for unknown permission', () => {
    expect(hasPermission(['ADMIN'], 'unknown:action')).toBe(false);
  });

  it('ADMIN can manage users', () => {
    expect(hasPermission(['ADMIN'], 'users:write')).toBe(true);
  });

  it('ANALYST cannot manage users', () => {
    expect(hasPermission(['ANALYST'], 'users:write')).toBe(false);
  });
});

describe('hasRole', () => {
  it('returns true when user has required role', () => {
    expect(hasRole(['ANALYST'], ['ANALYST', 'ADMIN'])).toBe(true);
  });

  it('returns false when user lacks required role', () => {
    expect(hasRole(['VIEWER'], ['ADMIN'])).toBe(false);
  });
});
