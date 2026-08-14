import type { Alert, Env, Webhook } from '../types';

import { signPayload } from './hmac';
import { retryFetch } from './retry';
import { formatCef, formatJson } from './siem-formatter';

const SEVERITY_ORDER = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function severityAtLeast(alertSeverity: string, minSeverity: string): boolean {
  return SEVERITY_ORDER.indexOf(alertSeverity) >= SEVERITY_ORDER.indexOf(minSeverity);
}

export async function dispatch(alert: Alert, env: Env): Promise<void> {
  const rows = await env.DB.prepare(`SELECT * FROM webhooks WHERE enabled=1`).all<Webhook>();

  const eligible = rows.results.filter((wh) => severityAtLeast(alert.severity, wh.minSeverity));

  await Promise.allSettled(eligible.map((webhook) => deliverOne(alert, webhook, env)));
}

async function deliverOne(alert: Alert, webhook: Webhook, env: Env): Promise<void> {
  const body = webhook.format === 'CEF' ? formatCef(alert) : formatJson(alert);
  const signature = await signPayload(webhook.secret, body);

  const result = await retryFetch(
    webhook.targetUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': webhook.format === 'CEF' ? 'text/plain' : 'application/json',
        'X-ToadGuard-Signature': signature,
        'User-Agent': 'ToadGuard-Exposure/1.0',
      },
      body,
    },
    5
  );

  await env.DB.prepare(
    `INSERT INTO webhook_deliveries
     (id, webhook_id, alert_id, attempt_number, status_code, response_body, delivered_at, success, error_message)
     VALUES (?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      crypto.randomUUID(),
      webhook.id,
      alert.id,
      result.attempts,
      result.statusCode ?? null,
      result.responseBody ?? null,
      new Date().toISOString(),
      result.success ? 1 : 0,
      result.errorMessage ?? null
    )
    .run();
}
