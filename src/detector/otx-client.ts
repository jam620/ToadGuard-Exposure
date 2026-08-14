import type { OtxResult } from '../types';

import { fetchWithTimeout } from '../collector/collector-utils';

const BASE = 'https://otx.alienvault.com/api/v1/indicators';

export async function lookupIp(ip: string, apiKey: string): Promise<OtxResult | undefined> {
  return lookup(`${BASE}/IPv4/${ip}/general`, apiKey);
}

export async function lookupDomain(domain: string, apiKey: string): Promise<OtxResult | undefined> {
  return lookup(`${BASE}/domain/${domain}/general`, apiKey);
}

export async function lookupHash(hash: string, apiKey: string): Promise<OtxResult | undefined> {
  return lookup(`${BASE}/file/${hash}/general`, apiKey);
}

async function lookup(url: string, apiKey: string): Promise<OtxResult | undefined> {
  let response: Response;
  try {
    response = await fetchWithTimeout(url, { headers: { 'X-OTX-API-KEY': apiKey } }, 5_000);
  } catch {
    return undefined;
  }

  if (!response.ok) return undefined;

  const data = (await response.json()) as {
    pulse_info?: { count?: number; pulses?: Array<{ tags?: string[]; references?: string[] }> };
    validation?: Array<{ name?: string }>;
  };

  const pulses = data.pulse_info?.pulses ?? [];
  const categories = pulses.flatMap((p) => p.tags ?? []);
  const references = pulses.flatMap((p) => p.references ?? []);

  return {
    pulseCount: data.pulse_info?.count ?? 0,
    malicious: (data.pulse_info?.count ?? 0) > 0,
    categories: [...new Set(categories)],
    references: [...new Set(references)].slice(0, 10),
  };
}
