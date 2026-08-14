import { describe, expect, it, vi } from 'vitest';

import { isCircuitOpen, isD1FullError, tripCircuit } from '../circuit-breaker';

function makeKv(stored: Record<string, string> = {}) {
  const store = { ...stored };
  return {
    get: vi.fn(async (key: string) => store[key] ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
  } as unknown as KVNamespace;
}

describe('isD1FullError', () => {
  it('matches the exact D1 size-limit error message', () => {
    expect(isD1FullError(new Error('D1_ERROR: Exceeded maximum DB size'))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isD1FullError(new Error('exceeded MAXIMUM db SIZE'))).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isD1FullError(new Error('D1_ERROR: no such table: alerts'))).toBe(false);
    expect(isD1FullError(new Error('network timeout'))).toBe(false);
  });

  it('handles non-Error values without throwing', () => {
    expect(isD1FullError('exceeded maximum db size')).toBe(true);
    expect(isD1FullError(undefined)).toBe(false);
  });
});

describe('circuit breaker KV state', () => {
  it('is closed when no flag is stored', async () => {
    const kv = makeKv();
    expect(await isCircuitOpen(kv)).toBe(false);
  });

  it('opens after tripCircuit and stores a TTL', async () => {
    const kv = makeKv();
    await tripCircuit(kv);

    expect(await isCircuitOpen(kv)).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      expect.stringContaining('circuit'),
      expect.any(String),
      expect.objectContaining({ expirationTtl: expect.any(Number) })
    );
  });
});
