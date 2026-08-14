import type { LeakRecord } from '../../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { enrich } from '../enrichment';

function makeRecord(overrides: Partial<LeakRecord> = {}): LeakRecord {
  return {
    id: 'r1',
    sourceId: 'test',
    sourceName: 'test',
    collectedAt: new Date().toISOString(),
    normalizedAt: new Date().toISOString(),
    dedupeKey: 'abc',
    rawData: '{}',
    tags: [],
    severity: 'HIGH',
    enriched: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enrich', () => {
  it('returns compositeScore and no indicators when APIs return nothing', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 500 }));
    const result = await enrich(makeRecord({ ipAddress: '1.2.3.4' }), 'otx-key', 'abuse-key');

    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.otx).toBeUndefined();
    expect(result.abuseIpDb).toBeUndefined();
    expect(result.indicators).toEqual([]);
  });

  it('populates otx when OTX returns pulses', async () => {
    const otxPayload = {
      pulse_info: { count: 3, pulses: [{ tags: ['malware'], references: ['http://example.com'] }] },
    };
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(otxPayload)));

    const result = await enrich(makeRecord({ ipAddress: '1.2.3.4' }), 'otx-key', undefined);

    expect(result.otx?.pulseCount).toBe(3);
    expect(result.otx?.malicious).toBe(true);
  });

  it('handles partial failure gracefully', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', async () => {
      callCount++;
      if (callCount === 1)
        return new Response(JSON.stringify({ pulse_info: { count: 0, pulses: [] } }));
      throw new Error('network error');
    });

    const result = await enrich(makeRecord({ ipAddress: '1.2.3.4' }), 'otx-key', 'abuse-key');
    expect(result).toBeDefined();
  });
});
