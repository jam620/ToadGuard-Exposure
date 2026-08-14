import type { Env } from '../../types';

import { describe, expect, it, vi } from 'vitest';

import { runCollector } from '../index';

function makeFakeDb(simulatedCount: number) {
  const stmt = {
    bind: () => stmt,
    first: async () => ({ count: simulatedCount }),
    all: async () => ({ results: [] }),
    run: async () => ({ meta: { changes: 1 } }),
  };
  const prepare = vi.fn((_sql: string) => stmt);
  return { prepare, batch: vi.fn(async () => []) } as unknown as Env['DB'];
}

function makeKv(): KVNamespace {
  return {
    get: vi.fn(async () => null),
    put: vi.fn(async () => undefined),
  } as unknown as KVNamespace;
}

function makeEnv(db: Env['DB'], overrides: Partial<Env> = {}): Env {
  return {
    DB: db,
    KV: makeKv(),
    ENVIRONMENT: 'staging',
    HIBP_BASE_URL: '',
    RSS_FEED_URL: '',
    JWT_ALGORITHM: 'RS256',
    ...overrides,
  };
}

describe('simulated source cap', () => {
  it('skips the simulated source once SIMULATED_SOURCE_MAX_RECORDS is reached', async () => {
    const db = makeFakeDb(2000); // == default cap
    const env = makeEnv(db);

    const summary = await runCollector(env);

    expect(summary).toEqual({ recordsProcessed: 0, alertsCreated: 0 });
    const prepareCalls = vi.mocked(db.prepare).mock.calls.map((c) => String(c[0]));
    expect(prepareCalls.some((sql) => sql.includes('INSERT INTO collector_jobs'))).toBe(false);
  });

  it('runs the simulated source when under the configured cap', async () => {
    const db = makeFakeDb(5);
    const env = makeEnv(db, { SIMULATED_SOURCE_MAX_RECORDS: '10' });

    await runCollector(env);

    const prepareCalls = vi.mocked(db.prepare).mock.calls.map((c) => String(c[0]));
    expect(prepareCalls.some((sql) => sql.includes('INSERT INTO collector_jobs'))).toBe(true);
  });

  it('falls back to the default cap when SIMULATED_SOURCE_MAX_RECORDS is not a valid number', async () => {
    const db = makeFakeDb(2000);
    const env = makeEnv(db, { SIMULATED_SOURCE_MAX_RECORDS: 'not-a-number' });

    const summary = await runCollector(env);

    expect(summary).toEqual({ recordsProcessed: 0, alertsCreated: 0 });
  });
});
