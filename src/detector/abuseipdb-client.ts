import type { AbuseIpDbResult } from '../types';

import { fetchWithTimeout } from '../collector/collector-utils';

const BASE = 'https://api.abuseipdb.com/api/v2';

export async function checkIp(ip: string, apiKey: string): Promise<AbuseIpDbResult | undefined> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${BASE}/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      { headers: { Key: apiKey, Accept: 'application/json' } },
      5_000
    );
  } catch {
    return undefined;
  }

  if (!response.ok) return undefined;

  const data = (await response.json()) as {
    data?: {
      abuseConfidenceScore?: number;
      isp?: string;
      countryCode?: string;
      totalReports?: number;
      lastReportedAt?: string;
    };
  };

  const d = data.data;
  if (!d) return undefined;

  return {
    abuseConfidenceScore: d.abuseConfidenceScore ?? 0,
    isp: d.isp ?? '',
    countryCode: d.countryCode ?? '',
    totalReports: d.totalReports ?? 0,
    lastReportedAt: d.lastReportedAt,
  };
}
