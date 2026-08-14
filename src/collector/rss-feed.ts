import { fetchWithTimeout } from './collector-utils';

export interface RssRaw {
  domain?: string;
  url?: string;
  source: string;
  tags: string[];
}

export async function fetchRssRecords(feedUrl: string): Promise<RssRaw[]> {
  let response: Response;
  try {
    response = await fetchWithTimeout(feedUrl, {}, 10_000);
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const text = await response.text();
  const results: RssRaw[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(text)) !== null) {
    const item = match[1] ?? '';
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const titleMatch = item.match(/<title>(.*?)<\/title>/);

    const link = linkMatch?.[1]?.trim();
    const title = titleMatch?.[1]?.trim() ?? '';

    let domain: string | undefined;
    if (link) {
      try {
        domain = new URL(link).hostname;
      } catch {
        // unparseable link
      }
    }

    results.push({
      domain,
      url: link,
      source: 'rss',
      tags: ['rss', 'threat-intel', ...(title ? [title.slice(0, 40)] : [])],
    });
  }

  return results;
}
