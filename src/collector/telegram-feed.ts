import { fetchWithTimeout } from './collector-utils';

export interface TelegramRaw {
  email?: string;
  username?: string;
  password_hash?: string;
  domain?: string;
  source: string;
  tags: string[];
}

export async function fetchTelegramRecords(
  botToken: string,
  chatIds: string,
  baseUrl = 'https://api.telegram.org'
): Promise<TelegramRaw[]> {
  const ids = chatIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const results: TelegramRaw[] = [];

  for (const chatId of ids) {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${baseUrl}/bot${botToken}/getUpdates?chat_id=${chatId}&limit=20`,
        {},
        8_000
      );
    } catch {
      continue;
    }

    if (!response.ok) continue;

    const data = (await response.json()) as {
      ok: boolean;
      result?: Array<{ message?: { text?: string } }>;
    };
    if (!data.ok || !data.result) continue;

    for (const update of data.result) {
      const text = update.message?.text;
      if (!text) continue;

      const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      const hashMatch = text.match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/);

      if (emailMatch || hashMatch) {
        results.push({
          email: emailMatch?.[0],
          password_hash: hashMatch?.[0],
          source: 'telegram',
          tags: ['telegram', `chat:${chatId}`],
        });
      }
    }
  }

  return results;
}
