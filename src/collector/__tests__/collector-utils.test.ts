import { afterEach, describe, expect, it, vi } from 'vitest';

import { deduplicateByHash, fetchWithTimeout } from '../collector-utils';

describe('deduplicateByHash', () => {
  it('removes items with duplicate dedupeKey', () => {
    const items = [
      { dedupeKey: 'abc', value: 1 },
      { dedupeKey: 'abc', value: 2 },
      { dedupeKey: 'def', value: 3 },
    ];
    const result = deduplicateByHash(items);
    expect(result).toHaveLength(2);
    expect(result[0]?.dedupeKey).toBe('abc');
    expect(result[1]?.dedupeKey).toBe('def');
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateByHash([])).toEqual([]);
  });
});

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aborts fetch when timeout is exceeded', async () => {
    // Returns a promise that never resolves but rejects when the AbortSignal fires.
    vi.stubGlobal(
      'fetch',
      (_url: string, opts?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );

    await expect(fetchWithTimeout('http://example.com', {}, 50)).rejects.toThrow('aborted');
  });
});
