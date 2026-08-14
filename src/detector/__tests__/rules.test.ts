import type { LeakRecord } from '../../types';

import { describe, expect, it } from 'vitest';

import { rules } from '../rules';

function makeRecord(overrides: Partial<LeakRecord> = {}): LeakRecord {
  return {
    id: 'test-id',
    sourceId: 'test',
    sourceName: 'test',
    collectedAt: new Date().toISOString(),
    normalizedAt: new Date().toISOString(),
    dedupeKey: 'abc123',
    rawData: '{}',
    tags: [],
    severity: 'INFO',
    enriched: false,
    ...overrides,
  };
}

function getRule(id: string) {
  const rule = rules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('rule-001: Exposed Password Hash', () => {
  it('matches when passwordHash is present', () => {
    expect(getRule('rule-001').match(makeRecord({ passwordHash: '$2b$10$abc' }))).toBe(true);
  });

  it('does not match when passwordHash is absent', () => {
    expect(getRule('rule-001').match(makeRecord())).toBe(false);
  });
});

describe('rule-002: Corporate Email Exposure', () => {
  it('matches corporate email', () => {
    expect(getRule('rule-002').match(makeRecord({ email: 'user@acme.com' }))).toBe(true);
  });

  it('does not match consumer email', () => {
    expect(getRule('rule-002').match(makeRecord({ email: 'user@gmail.com' }))).toBe(false);
  });

  it('does not match when email is absent', () => {
    expect(getRule('rule-002').match(makeRecord())).toBe(false);
  });
});

describe('rule-005: Multi-field Credential Combo', () => {
  it('matches when both email and passwordHash present', () => {
    expect(
      getRule('rule-005').match(makeRecord({ email: 'a@b.com', passwordHash: '$2b$hash' }))
    ).toBe(true);
  });

  it('does not match with email only', () => {
    expect(getRule('rule-005').match(makeRecord({ email: 'a@b.com' }))).toBe(false);
  });
});

describe('rule-006: Telegram Source', () => {
  it('matches when telegram tag present', () => {
    expect(getRule('rule-006').match(makeRecord({ tags: ['telegram'] }))).toBe(true);
  });

  it('does not match without telegram tag', () => {
    expect(getRule('rule-006').match(makeRecord({ tags: ['hibp'] }))).toBe(false);
  });
});
