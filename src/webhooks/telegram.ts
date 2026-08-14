import type { Alert, Env } from '../types';

/**
 * Sends one summary message to every configured Telegram chat.
 * Groups all alerts into a single message to avoid rate-limit spam.
 * Silently no-ops if credentials are missing or malformed.
 */
export async function sendTelegramNotification(alerts: Alert[], env: Env): Promise<void> {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_IDS: chatIdsJson } = env;
  if (!token || !chatIdsJson) return;

  let chatIds: string[];
  try {
    const parsed = JSON.parse(chatIdsJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    chatIds = parsed.map(String);
  } catch {
    return;
  }

  const lines = alerts.map((a) => `• *${a.ruleName}* — score: ${a.compositeScore}/100`);

  const text = [
    `🚨 *ToadGuard — ${alerts.length} CRITICAL alert${alerts.length > 1 ? 's' : ''}*`,
    '',
    ...lines,
    '',
    `_${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC_`,
  ].join('\n');

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  await Promise.allSettled(
    chatIds.map((chatId) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(5_000),
      })
    )
  );
}
