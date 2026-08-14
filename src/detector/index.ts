import type { Alert, Env, LeakRecord, Severity } from '../types';

import { dispatch } from '../webhooks/dispatcher';
import { sendTelegramNotification } from '../webhooks/telegram';
import { buildAlert } from './alert-builder';
import { enrich } from './enrichment';
import { rules } from './rules';
import { calculateCompositeScore } from './severity-scorer';

export async function runDetection(record: LeakRecord, env: Env) {
  const matchingRules = rules.filter((r) => r.enabled && r.match(record));
  if (matchingRules.length === 0) return [];

  const enrichmentResult = await enrich(record, env.OTX_API_KEY, env.ABUSEIPDB_API_KEY);

  return matchingRules.map((rule) => {
    const score = calculateCompositeScore(
      rule.severity,
      enrichmentResult.otx,
      enrichmentResult.abuseIpDb
    );
    return buildAlert(record, rule, enrichmentResult, score);
  });
}

// D1 row shape for leak_records (snake_case column names)
export type LeakRecordRow = {
  id: string;
  source_id: string;
  source_name: string;
  collected_at: string;
  normalized_at: string;
  dedupe_key: string;
  email: string | null;
  username: string | null;
  password_hash: string | null;
  ip_address: string | null;
  domain: string | null;
  url: string | null;
  raw_data: string;
  tags: string;
  severity: string;
  enriched: number;
};

export function rowToLeakRecord(row: LeakRecordRow): LeakRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    collectedAt: row.collected_at,
    normalizedAt: row.normalized_at,
    dedupeKey: row.dedupe_key,
    email: row.email ?? undefined,
    username: row.username ?? undefined,
    passwordHash: row.password_hash ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    domain: row.domain ?? undefined,
    url: row.url ?? undefined,
    rawData: row.raw_data,
    tags: JSON.parse(row.tags) as string[],
    severity: row.severity as Severity,
    enriched: Boolean(row.enriched),
  };
}

// Process up to this many records per cron invocation to stay within CPU budget.
const DETECT_BATCH = 30;

export async function detectAndPersistBatch(
  records: LeakRecord[],
  env: Env
): Promise<{ alertsCreated: number; recordsProcessed: number }> {
  const { DB } = env;
  let alertsCreated = 0;
  const batch = records.slice(0, DETECT_BATCH);
  const newAlerts: Alert[] = [];

  for (const record of batch) {
    try {
      const enrichmentResult = await enrich(record, env.OTX_API_KEY, env.ABUSEIPDB_API_KEY);
      const matchingRules = rules.filter((r) => r.enabled && r.match(record));

      const stmts: D1PreparedStatement[] = [];

      for (const rule of matchingRules) {
        const score = calculateCompositeScore(
          rule.severity,
          enrichmentResult.otx,
          enrichmentResult.abuseIpDb
        );
        const alert = buildAlert(record, rule, enrichmentResult, score);
        stmts.push(
          DB.prepare(
            `INSERT OR IGNORE INTO alerts
             (id, record_id, rule_id, rule_name, severity, status, composite_score, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?)`
          ).bind(
            alert.id,
            alert.recordId,
            alert.ruleId,
            alert.ruleName,
            alert.severity,
            alert.status,
            alert.compositeScore,
            alert.createdAt,
            alert.updatedAt
          )
        );
        newAlerts.push(alert);
        alertsCreated++;
      }

      // Only persist enrichment rows when the record had an actionable IOC
      if (record.ipAddress || record.domain) {
        stmts.push(
          DB.prepare(
            `INSERT OR IGNORE INTO enrichment_results
             (id, record_id, enriched_at, otx_pulse_count, otx_malicious, otx_categories,
              otx_references, abuse_confidence_score, abuse_isp, abuse_country_code,
              abuse_total_reports, abuse_last_reported_at, composite_score, indicators)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          ).bind(
            crypto.randomUUID(),
            record.id,
            enrichmentResult.enrichedAt,
            enrichmentResult.otx?.pulseCount ?? null,
            enrichmentResult.otx?.malicious ? 1 : null,
            JSON.stringify(enrichmentResult.otx?.categories ?? []),
            JSON.stringify(enrichmentResult.otx?.references ?? []),
            enrichmentResult.abuseIpDb?.abuseConfidenceScore ?? null,
            enrichmentResult.abuseIpDb?.isp ?? null,
            enrichmentResult.abuseIpDb?.countryCode ?? null,
            enrichmentResult.abuseIpDb?.totalReports ?? null,
            enrichmentResult.abuseIpDb?.lastReportedAt ?? null,
            enrichmentResult.compositeScore,
            JSON.stringify(enrichmentResult.indicators)
          )
        );
      }

      // Always mark enriched=1 so the record is not reprocessed
      stmts.push(DB.prepare('UPDATE leak_records SET enriched = 1 WHERE id = ?').bind(record.id));

      await DB.batch(stmts);
    } catch {
      // Don't let one failure block the rest; mark enriched to avoid infinite retry
      try {
        await DB.prepare('UPDATE leak_records SET enriched = 1 WHERE id = ?').bind(record.id).run();
      } catch {
        // best-effort
      }
    }
  }

  // Fire notifications after all DB writes — failures must not affect the return value
  if (newAlerts.length > 0) {
    const criticalAlerts = newAlerts.filter((a) => a.severity === 'CRITICAL');
    await Promise.allSettled([
      // Webhook delivery (no-op when no webhooks are configured in D1)
      ...newAlerts.map((a) => dispatch(a, env)),
      // Telegram: one summary message per batch to avoid rate-limit spam
      criticalAlerts.length > 0 ? sendTelegramNotification(criticalAlerts, env) : Promise.resolve(),
    ]);
  }

  return { alertsCreated, recordsProcessed: batch.length };
}
