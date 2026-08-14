import type { EnrichmentResult, LeakRecord } from '../types';

import { checkIp } from './abuseipdb-client';
import { lookupDomain, lookupIp } from './otx-client';
import { calculateCompositeScore } from './severity-scorer';

export async function enrich(
  record: LeakRecord,
  otxApiKey: string | undefined,
  abuseApiKey: string | undefined
): Promise<EnrichmentResult> {
  const [otxResult, abuseResult] = await Promise.allSettled([
    otxApiKey && (record.ipAddress || record.domain)
      ? record.ipAddress
        ? lookupIp(record.ipAddress, otxApiKey)
        : lookupDomain(record.domain!, otxApiKey)
      : Promise.resolve(undefined),
    abuseApiKey && record.ipAddress
      ? checkIp(record.ipAddress, abuseApiKey)
      : Promise.resolve(undefined),
  ]);

  const otx = otxResult.status === 'fulfilled' ? otxResult.value : undefined;
  const abuseIpDb = abuseResult.status === 'fulfilled' ? abuseResult.value : undefined;

  const indicators: string[] = [];
  if (otx?.malicious) indicators.push(`OTX: ${otx.pulseCount} malicious pulses`);
  if ((abuseIpDb?.abuseConfidenceScore ?? 0) > 50)
    indicators.push(`AbuseIPDB: ${abuseIpDb?.abuseConfidenceScore}% confidence`);

  const compositeScore = calculateCompositeScore(
    record.severity,
    otx ?? undefined,
    abuseIpDb ?? undefined
  );

  return {
    recordId: record.id,
    enrichedAt: new Date().toISOString(),
    otx: otx ?? undefined,
    abuseIpDb: abuseIpDb ?? undefined,
    compositeScore,
    indicators,
  };
}
