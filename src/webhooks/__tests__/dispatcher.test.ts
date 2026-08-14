import type { Alert } from '../../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatCef, formatJson } from '../siem-formatter';
import { signPayload } from '../hmac';

const mockAlert: Alert = {
  id: 'alert-1',
  recordId: 'rec-1',
  ruleId: 'rule-001',
  ruleName: 'Test Rule',
  severity: 'HIGH',
  status: 'OPEN',
  compositeScore: 70,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

afterEach(() => vi.restoreAllMocks());

describe('formatJson', () => {
  it('produces valid JSON with required fields', () => {
    const json = formatJson(mockAlert);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed['id']).toBe('alert-1');
    expect(parsed['severity']).toBe('HIGH');
    expect(parsed['compositeScore']).toBe(70);
  });
});

describe('formatCef', () => {
  it('starts with CEF:0 header', () => {
    expect(formatCef(mockAlert)).toMatch(/^CEF:0\|/);
  });

  it('maps HIGH severity to CEF level 7', () => {
    expect(formatCef(mockAlert)).toContain('|7|');
  });
});

describe('signPayload', () => {
  it('returns sha256= prefixed hex string', async () => {
    const sig = await signPayload('my-secret', 'body-data');
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('produces different signatures for different secrets', async () => {
    const a = await signPayload('secret-a', 'same-body');
    const b = await signPayload('secret-b', 'same-body');
    expect(a).not.toBe(b);
  });

  it('produces different signatures for different bodies', async () => {
    const a = await signPayload('same-secret', 'body-a');
    const b = await signPayload('same-secret', 'body-b');
    expect(a).not.toBe(b);
  });
});
