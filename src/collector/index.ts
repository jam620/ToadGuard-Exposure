import type { Env, LeakRecord } from '../types';
import type { LeakRecordRow } from '../detector';

import { logStageError, logStageInfo } from '../debug-log';
import { detectAndPersistBatch, rowToLeakRecord } from '../detector';
import { normalize } from '../normalizer';
import { buildCollectorJobId } from './collector-utils';
import { isCircuitOpen, isD1FullError, tripCircuit } from './circuit-breaker';
import { fetchHibpRecords } from './hib-feed';
import { fetchRssRecords } from './rss-feed';
import { generateSimulatedRecords } from './simulated-feed';
import { fetchTelegramRecords } from './telegram-feed';

interface CollectorSource {
  name: string;
  fetch: () => Promise<unknown[]>;
}

async function persistRecords(
  records: Awaited<ReturnType<typeof normalize>>[],
  db: D1Database,
  jobId: string
): Promise<{ inserted: number; errors: string[]; newRecords: LeakRecord[] }> {
  let inserted = 0;
  const errors: string[] = [];
  const newRecords: LeakRecord[] = [];

  for (const { record, warnings } of records) {
    if (warnings.length) {
      // log but don't block
    }
    try {
      const result = await db
        .prepare(
          `INSERT OR IGNORE INTO leak_records
           (id, source_id, source_name, collected_at, normalized_at, dedupe_key,
            email, username, password_hash, ip_address, domain, url,
            raw_data, tags, severity, enriched)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .bind(
          record.id,
          record.sourceId,
          record.sourceName,
          record.collectedAt,
          record.normalizedAt,
          record.dedupeKey,
          record.email ?? null,
          record.username ?? null,
          record.passwordHash ?? null,
          record.ipAddress ?? null,
          record.domain ?? null,
          record.url ?? null,
          record.rawData,
          JSON.stringify(record.tags),
          record.severity,
          record.enriched ? 1 : 0
        )
        .run();

      // meta.changes === 1 means the row was inserted (not ignored as a duplicate)
      if (result.meta.changes > 0) {
        inserted++;
        newRecords.push(record);
      }
    } catch (err) {
      errors.push(String(err));
    }
  }

  try {
    await db
      .prepare(`UPDATE collector_jobs SET finished_at=?, records_inserted=?, errors=? WHERE id=?`)
      .bind(new Date().toISOString(), inserted, JSON.stringify(errors), jobId)
      .run();
  } catch (err) {
    logStageError('collector.persist', 'update-collector-job', err, {
      jobId,
      inserted,
      recordCount: records.length,
      perRecordErrors: errors.length,
    });
    throw err;
  }

  return { inserted, errors, newRecords };
}

// Backfill: number of old unenriched records to process per cron run.
const BACKFILL_BATCH = 30;

// The 'simulated' source has no natural end (it's fake demo data), and ran
// unbounded every 5 minutes for ~4 months in staging, which is what actually
// filled D1 to its size limit (99.9996% of leak_records). Cap how many
// simulated rows can accumulate in total instead of removing the source.
const DEFAULT_SIMULATED_SOURCE_MAX_RECORDS = 2000;

function getSimulatedSourceCap(env: Env): number {
  const parsed = Number(env.SIMULATED_SOURCE_MAX_RECORDS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SIMULATED_SOURCE_MAX_RECORDS;
}

export interface CollectorRunSummary {
  recordsProcessed: number;
  alertsCreated: number;
  /** Set when the run short-circuited before touching D1 or any source. */
  skipped?: 'disabled' | 'circuit-open';
}

export async function runCollector(env: Env): Promise<CollectorRunSummary> {
  if (env.COLLECTOR_ENABLED === 'false') {
    logStageInfo('collector', 'runCollector-skipped', { reason: 'COLLECTOR_ENABLED=false' });
    return { recordsProcessed: 0, alertsCreated: 0, skipped: 'disabled' };
  }

  if (await isCircuitOpen(env.KV)) {
    logStageInfo('collector', 'runCollector-skipped', { reason: 'circuit-open-d1-full' });
    return { recordsProcessed: 0, alertsCreated: 0, skipped: 'circuit-open' };
  }

  try {
    return await runCollectorOnce(env);
  } catch (err) {
    if (isD1FullError(err)) {
      await tripCircuit(env.KV);
      logStageError('collector.circuit-breaker', 'trip', err, { cooldownSeconds: 900 });
    }
    throw err;
  }
}

async function runCollectorOnce(env: Env): Promise<CollectorRunSummary> {
  let recordsProcessed = 0;
  let alertsCreated = 0;

  const sources: CollectorSource[] = [];

  const simulatedCap = getSimulatedSourceCap(env);
  const simulatedCountRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM leak_records WHERE source_id = 'simulated'`
  ).first<{ count: number }>();
  const simulatedCount = simulatedCountRow?.count ?? 0;

  if (simulatedCount < simulatedCap) {
    const remaining = simulatedCap - simulatedCount;
    sources.push({
      name: 'simulated',
      fetch: async () => generateSimulatedRecords().slice(0, remaining),
    });
  } else {
    logStageInfo('collector.fetch', 'simulated-capped', { simulatedCount, simulatedCap });
  }

  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_IDS) {
    sources.push({
      name: 'telegram',
      fetch: () => fetchTelegramRecords(env.TELEGRAM_BOT_TOKEN!, env.TELEGRAM_CHAT_IDS!),
    });
  }

  if (env.HIBP_BASE_URL) {
    sources.push({
      name: 'hibp',
      fetch: () => fetchHibpRecords(env.HIBP_BASE_URL, ''),
    });
  }

  if (env.RSS_FEED_URL) {
    sources.push({
      name: 'rss',
      fetch: () => fetchRssRecords(env.RSS_FEED_URL),
    });
  }

  for (const source of sources) {
    const jobId = buildCollectorJobId();
    const startedAt = new Date().toISOString();

    await env.DB.prepare(`INSERT INTO collector_jobs (id, source, started_at) VALUES (?,?,?)`)
      .bind(jobId, source.name, startedAt)
      .run();

    let rawItems: unknown[] = [];
    try {
      rawItems = await source.fetch();
    } catch (err) {
      logStageError('collector.fetch', source.name, err, { jobId });
      await env.DB.prepare(`UPDATE collector_jobs SET finished_at=?, errors=? WHERE id=?`)
        .bind(new Date().toISOString(), JSON.stringify(['fetch failed']), jobId)
        .run();
      continue;
    }

    await env.DB.prepare(`UPDATE collector_jobs SET records_fetched=? WHERE id=?`)
      .bind(rawItems.length, jobId)
      .run();

    const normalized = await Promise.allSettled(
      rawItems.map((item) => normalize(item, source.name))
    );

    const successful = normalized
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof normalize>>> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value);

    const { newRecords } = await persistRecords(successful, env.DB, jobId);
    recordsProcessed += newRecords.length;

    // Run detection immediately on records inserted in this job
    if (newRecords.length > 0) {
      try {
        const result = await detectAndPersistBatch(newRecords, env);
        alertsCreated += result.alertsCreated;
      } catch (err) {
        logStageError('collector.detect', source.name, err, {
          jobId,
          newRecords: newRecords.length,
        });
        throw err;
      }
    }
  }

  // Backfill: process a batch of old records that predate the detection pipeline
  try {
    const backfillResult = await env.DB.prepare(
      `SELECT * FROM leak_records WHERE enriched = 0 ORDER BY created_at DESC LIMIT ?`
    )
      .bind(BACKFILL_BATCH)
      .all<LeakRecordRow>();

    if (backfillResult.results.length > 0) {
      const records = backfillResult.results.map(rowToLeakRecord);
      const result = await detectAndPersistBatch(records, env);
      recordsProcessed += result.recordsProcessed;
      alertsCreated += result.alertsCreated;
    }
  } catch (err) {
    logStageError('collector.backfill', 'detectAndPersistBatch', err, {
      recordsProcessed,
      alertsCreated,
    });
    throw err;
  }

  logStageInfo('collector', 'runCollector', {
    sources: sources.length,
    recordsProcessed,
    alertsCreated,
  });

  return { recordsProcessed, alertsCreated };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runCollector(env);
  },
};
