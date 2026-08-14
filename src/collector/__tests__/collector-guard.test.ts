import type { Env } from '../../types';

import { describe, expect, it, vi } from 'vitest';

import { runCollector } from '../index';

// Any DB/KV access here means the guard didn't short-circuit early enough.
function makeUntouchableDb(): Env['DB'] {
  return {
    prepare: () => {
      throw new Error('DB should not be touched while the collector is paused/tripped');
    },
    batch: () => {
      throw new Error('DB should not be touched while the collector is paused/tripped');
    },
  } as unknown as Env['DB'];
}

function makeEnv(overrides: Partial<Env> & { kvGet?: () => Promise<string | null> } = {}): Env {
  const { kvGet, ...envOverrides } = overrides;
  const kv = {
    get: vi.fn(kvGet ?? (async () => null)),
    put: vi.fn(async () => undefined),
  } as unknown as KVNamespace;

  return {
    DB: makeUntouchableDb(),
    KV: kv,
    ENVIRONMENT: 'staging',
    HIBP_BASE_URL: '',
    RSS_FEED_URL: '',
    JWT_ALGORITHM: 'RS256',
    ...envOverrides,
  };
}

describe('runCollector guards', () => {
  it('skips without touching D1 or KV when COLLECTOR_ENABLED=false', async () => {
    const env = makeEnv({ COLLECTOR_ENABLED: 'false' });

    const summary = await runCollector(env);

    expect(summary).toEqual({ recordsProcessed: 0, alertsCreated: 0, skipped: 'disabled' });
    expect(env.KV.get).not.toHaveBeenCalled();
  });

  it('skips without touching D1 when the circuit breaker is open', async () => {
    const env = makeEnv({ kvGet: async () => new Date().toISOString() });

    const summary = await runCollector(env);

    expect(summary).toEqual({ recordsProcessed: 0, alertsCreated: 0, skipped: 'circuit-open' });
  });

  it('does not skip when COLLECTOR_ENABLED is unset and the circuit is closed', async () => {
    const env = makeEnv();

    // No sources configured except "simulated" always runs — this proves the
    // guard passed through by reaching DB access (which throws in our stub),
    // rather than returning a skip summary.
    await expect(runCollector(env)).rejects.toThrow(/should not be touched/);
  });
});
