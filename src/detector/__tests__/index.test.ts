import type { Env, LeakRecord } from '../../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { dispatch } from '../../webhooks/dispatcher';
import { sendTelegramNotification } from '../../webhooks/telegram';
import { detectAndPersistBatch } from '../index';

vi.mock('../../webhooks/dispatcher', () => ({ dispatch: vi.fn(async () => undefined) }));
vi.mock('../../webhooks/telegram', () => ({
  sendTelegramNotification: vi.fn(async () => undefined),
}));

function makeRecord(overrides: Partial<LeakRecord> = {}): LeakRecord {
  return {
    id: 'r1',
    sourceId: 'simulated',
    sourceName: 'simulated',
    collectedAt: '2024-01-01T00:00:00Z',
    normalizedAt: '2024-01-01T00:00:00Z',
    dedupeKey: 'abc',
    rawData: '{}',
    tags: [],
    severity: 'MEDIUM',
    enriched: false,
    ...overrides,
  };
}

// Matches rule-003 (IP) and rule-004 (domain) — 2 alert-insert stmts, in that order.
function makeIpDomainRecord(overrides: Partial<LeakRecord> = {}): LeakRecord {
  return makeRecord({ ipAddress: '1.2.3.4', domain: 'evil.example.com', ...overrides });
}

/**
 * Fake D1 whose `batch()` reports, per statement index in a single call,
 * whether the row was actually written (changes=1) or silently ignored as a
 * duplicate by a unique index (changes=0) — mirrors what
 * idx_alerts_record_rule does for `INSERT OR IGNORE INTO alerts`.
 */
function makeFakeDb(changesByStmtIndex: number[]): Env['DB'] {
  const stmt = {
    bind: () => stmt,
    run: async () => ({ meta: { changes: 1 } }),
    all: async () => ({ results: [] }),
  };
  const batch = vi.fn(async (stmts: unknown[]) =>
    stmts.map((_, i) => ({ meta: { changes: changesByStmtIndex[i] ?? 1 } }))
  );
  return { prepare: () => stmt, batch } as unknown as Env['DB'];
}

function makeEnv(db: Env['DB']): Env {
  return {
    DB: db,
    KV: {} as KVNamespace,
    ENVIRONMENT: 'test',
    HIBP_BASE_URL: '',
    RSS_FEED_URL: '',
    JWT_ALGORITHM: 'RS256',
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('detectAndPersistBatch — alert deduplication', () => {
  it('counts and notifies only alerts the unique index actually inserted', async () => {
    // record matches rule-003 (IP) and rule-004 (domain) -> 2 alert-insert stmts.
    // First reports as newly inserted, second as an ignored duplicate.
    const db = makeFakeDb([1, 0]);
    const env = makeEnv(db);

    const result = await detectAndPersistBatch([makeIpDomainRecord()], env);

    expect(result.alertsCreated).toBe(1);
    expect(result.recordsProcessed).toBe(1);
    expect(vi.mocked(dispatch)).toHaveBeenCalledTimes(1);
  });

  it('creates no alerts and sends no notifications when every match is a duplicate', async () => {
    const db = makeFakeDb([0, 0]);
    const env = makeEnv(db);

    const result = await detectAndPersistBatch([makeIpDomainRecord()], env);

    expect(result.alertsCreated).toBe(0);
    expect(vi.mocked(dispatch)).not.toHaveBeenCalled();
    expect(vi.mocked(sendTelegramNotification)).not.toHaveBeenCalled();
  });

  it('notifies Telegram only for the newly-inserted CRITICAL alert, not a re-detected duplicate', async () => {
    // email + passwordHash matches rule-001, rule-002, rule-005 (CRITICAL).
    // Script rule-005's insert (last stmt pushed) as a duplicate.
    const record = makeRecord({
      email: 'victim@corp.io',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRS1234',
    });
    const db = makeFakeDb([1, 1, 0]);
    const env = makeEnv(db);

    const result = await detectAndPersistBatch([record], env);

    expect(result.alertsCreated).toBe(2);
    expect(vi.mocked(sendTelegramNotification)).not.toHaveBeenCalled();
  });

  it('marks the record enriched even when every alert insert is a duplicate', async () => {
    const db = makeFakeDb([0, 0]);
    const env = makeEnv(db);

    await detectAndPersistBatch([makeIpDomainRecord()], env);

    expect(vi.mocked(db.batch)).toHaveBeenCalledTimes(1);
    const stmts = vi.mocked(db.batch).mock.calls[0]?.[0] as unknown[];
    // 2 alert inserts + enrichment_results (has ipAddress/domain) + enriched update
    expect(stmts).toHaveLength(4);
  });
});
