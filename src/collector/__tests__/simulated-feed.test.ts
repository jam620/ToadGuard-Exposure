import { describe, expect, it } from 'vitest';

import { generateSimulatedRecords } from '../simulated-feed';

describe('generateSimulatedRecords', () => {
  it('returns between 5 and 20 records by default', () => {
    const records = generateSimulatedRecords();
    expect(records.length).toBeGreaterThanOrEqual(5);
    expect(records.length).toBeLessThanOrEqual(20);
  });

  it('returns exact count when specified', () => {
    const records = generateSimulatedRecords(7);
    expect(records).toHaveLength(7);
  });

  it('every record has a source field equal to simulated', () => {
    const records = generateSimulatedRecords(5);
    for (const r of records) {
      expect(r.source).toBe('simulated');
    }
  });

  it('every record has a non-empty tags array', () => {
    const records = generateSimulatedRecords(5);
    for (const r of records) {
      expect(r.tags.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for the same 5-minute window', () => {
    const a = generateSimulatedRecords(10);
    const b = generateSimulatedRecords(10);
    expect(a).toEqual(b);
  });
});
