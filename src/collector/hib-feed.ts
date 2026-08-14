import { fetchWithTimeout } from './collector-utils';

export interface HibpRaw {
  email?: string;
  domain?: string;
  source: string;
  tags: string[];
}

export async function fetchHibpRecords(baseUrl: string, apiKey: string): Promise<HibpRaw[]> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${baseUrl}/latestbreaches`,
      {
        headers: {
          'hibp-api-key': apiKey,
          'User-Agent': 'ToadGuard-Exposure/1.0',
        },
      },
      8_000
    );
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const breaches = (await response.json()) as Array<{
    Domain?: string;
    Name?: string;
    DataClasses?: string[];
  }>;

  return breaches
    .filter((b) => b.Domain)
    .map((b) => ({
      domain: b.Domain,
      source: 'hibp',
      tags: ['hibp', ...(b.DataClasses ?? []).map((c) => c.toLowerCase().replace(/\s+/g, '-'))],
    }));
}
