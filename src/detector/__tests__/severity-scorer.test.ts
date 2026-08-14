import { describe, expect, it } from 'vitest';

import { calculateCompositeScore } from '../severity-scorer';

describe('calculateCompositeScore', () => {
  it('returns base score for CRITICAL with no enrichment', () => {
    expect(calculateCompositeScore('CRITICAL', undefined, undefined)).toBe(80);
  });

  it('adds 10 points when OTX marks as malicious', () => {
    const otx = { pulseCount: 1, malicious: true, categories: [], references: [] };
    expect(calculateCompositeScore('HIGH', otx, undefined)).toBe(70);
  });

  it('adds 5 more points when OTX pulse count > 5', () => {
    const otx = { pulseCount: 6, malicious: true, categories: [], references: [] };
    expect(calculateCompositeScore('HIGH', otx, undefined)).toBe(75);
  });

  it('adds AbuseIPDB score fraction', () => {
    const abuse = { abuseConfidenceScore: 80, isp: '', countryCode: '', totalReports: 5 };
    expect(calculateCompositeScore('MEDIUM', undefined, abuse)).toBe(48);
  });

  it('never exceeds 100', () => {
    const otx = { pulseCount: 100, malicious: true, categories: [], references: [] };
    const abuse = { abuseConfidenceScore: 100, isp: '', countryCode: '', totalReports: 999 };
    expect(calculateCompositeScore('CRITICAL', otx, abuse)).toBe(100);
  });

  it('never goes below 0', () => {
    expect(calculateCompositeScore('INFO', undefined, undefined)).toBe(5);
  });
});
