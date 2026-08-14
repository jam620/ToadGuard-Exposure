import { describe, expect, it, vi, beforeAll } from 'vitest';

import { normalize } from '../../src/normalizer';
import { runDetection } from '../../src/detector';
import { generateSimulatedRecords } from '../../src/collector/simulated-feed';

describe('collector → normalizer → detector pipeline', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ pulse_info: { count: 0, pulses: [] } })));
  });

  it('simulated feed produces normalizable records', async () => {
    const rawRecords = generateSimulatedRecords(5);
    expect(rawRecords.length).toBe(5);

    for (const raw of rawRecords) {
      const { record, warnings } = await normalize(raw, 'simulated');
      expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(record.sourceId).toBe('simulated');
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(record.severity);
      if (raw.email) expect(record.email).toBe(raw.email);
      expect(Array.isArray(warnings)).toBe(true);
    }
  });

  it('detector generates alerts for records with matching rules', async () => {
    const raw = {
      email: 'victim@corp.io',
      password_hash: '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRS1234',
      source: 'simulated',
      tags: ['darkweb'],
    };

    const { record } = await normalize(raw, 'simulated');

    const mockEnv = {
      DB: {} as D1Database,
      KV: {} as KVNamespace,
      ENVIRONMENT: 'test',
      HIBP_BASE_URL: '',
      RSS_FEED_URL: '',
      JWT_ALGORITHM: 'RS256',
      OTX_API_KEY: undefined,
      ABUSEIPDB_API_KEY: undefined,
    };

    const alerts = await runDetection(record, mockEnv);

    expect(alerts.length).toBeGreaterThan(0);
    const ruleIds = alerts.map((a) => a.ruleId);
    expect(ruleIds).toContain('rule-005');
    expect(ruleIds).toContain('rule-007');
    for (const alert of alerts) {
      expect(alert.status).toBe('OPEN');
      expect(alert.recordId).toBe(record.id);
      expect(alert.compositeScore).toBeGreaterThan(0);
    }
  });

  it('records with no matching rules generate no alerts', async () => {
    const raw = { username: 'nobody', source: 'rss', tags: ['rss'] };
    const { record } = await normalize(raw, 'rss');

    const mockEnv = {
      DB: {} as D1Database,
      KV: {} as KVNamespace,
      ENVIRONMENT: 'test',
      HIBP_BASE_URL: '',
      RSS_FEED_URL: '',
      JWT_ALGORITHM: 'RS256',
    };

    const alerts = await runDetection(record, mockEnv as unknown as typeof mockEnv & { OTX_API_KEY?: string; ABUSEIPDB_API_KEY?: string });
    expect(alerts).toHaveLength(0);
  });
});
