import type { Alert, Env, LeakRecord } from '../types';

import { logStageError, logStageInfo } from '../debug-log';

/** An alert paired with the leak record that triggered it, for display context. */
export interface AlertNotificationContext {
  alert: Alert;
  record: LeakRecord;
}

interface IndicatorGroup {
  indicator: string;
  sourceName: string;
  entries: { ruleName: string; score: number }[];
  maxScore: number;
}

// Keep the message well under Telegram's 4096-char limit even for large CRITICAL batches.
const MAX_GROUPS_SHOWN = 15;

function extractIndicator(record: LeakRecord): string {
  return (
    record.email ?? record.username ?? record.ipAddress ?? record.domain ?? record.url ?? 'unknown'
  );
}

// Indicator/source values come from external leak data — strip backticks so they
// can't break out of a Markdown code span, and cap length defensively.
function sanitizeForCodeSpan(text: string): string {
  return text.replace(/`/g, "'").slice(0, 200);
}

function groupByIndicator(contexts: AlertNotificationContext[]): IndicatorGroup[] {
  const groups = new Map<string, IndicatorGroup>();

  for (const { alert, record } of contexts) {
    const indicator = extractIndicator(record);
    const key = `${indicator}|${record.sourceName}`;

    let group = groups.get(key);
    if (!group) {
      group = { indicator, sourceName: record.sourceName, entries: [], maxScore: 0 };
      groups.set(key, group);
    }
    group.entries.push({ ruleName: alert.ruleName, score: alert.compositeScore });
    group.maxScore = Math.max(group.maxScore, alert.compositeScore);
  }

  return [...groups.values()].sort((a, b) => b.maxScore - a.maxScore);
}

function buildLeaksUrl(env: Env): string {
  const base = env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:5173';
  const url = new URL('/leaks', base);
  url.searchParams.set('severity', 'CRITICAL');
  return url.toString();
}

function buildMessage(contexts: AlertNotificationContext[], env: Env): string {
  const groups = groupByIndicator(contexts);
  const shown = groups.slice(0, MAX_GROUPS_SHOWN);
  const omitted = groups.length - shown.length;

  const groupBlocks = shown.map((g) => {
    const header = `• \`${sanitizeForCodeSpan(g.indicator)}\` — fuente: \`${sanitizeForCodeSpan(g.sourceName)}\``;
    const ruleLines = g.entries
      .sort((a, b) => b.score - a.score)
      .map((e) => `   ${e.ruleName} — score: ${e.score}/100`);
    return [header, ...ruleLines].join('\n');
  });

  if (omitted > 0) {
    groupBlocks.push(`_…y ${omitted} indicador${omitted > 1 ? 'es' : ''} más_`);
  }

  const totalAlerts = contexts.length;
  const title = `🚨 *ToadGuard — ${totalAlerts} CRITICAL alert${totalAlerts > 1 ? 's' : ''} (${groups.length} indicador${groups.length > 1 ? 'es' : ''})*`;
  const timestamp = `_${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC_`;

  return [title, '', groupBlocks.join('\n\n'), '', `🔗 ${buildLeaksUrl(env)}`, timestamp].join(
    '\n'
  );
}

/**
 * Sends one summary message to every configured Telegram chat.
 * Groups alerts by indicator (email/username/IP/domain/url) so repeated rule
 * matches on the same indicator collapse into a single entry, and links to the
 * filtered CRITICAL leaks view. Silently no-ops if credentials are missing or malformed.
 */
export async function sendTelegramNotification(
  contexts: AlertNotificationContext[],
  env: Env
): Promise<void> {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_IDS: chatIdsJson } = env;
  if (!token || !chatIdsJson || contexts.length === 0) return;

  let chatIds: string[];
  try {
    const parsed = JSON.parse(chatIdsJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    chatIds = parsed.map(String);
  } catch {
    return;
  }

  const text = buildMessage(contexts, env);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const results = await Promise.allSettled(
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

  // Log delivery outcomes without ever including chat IDs or response bodies.
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      logStageError('telegram', 'sendMessage', result.reason, { chatIndex: i });
    } else if (!result.value.ok) {
      logStageInfo('telegram', 'sendMessage', { chatIndex: i, httpStatus: result.value.status });
    }
  });
}
