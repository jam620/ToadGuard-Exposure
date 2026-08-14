import type { Env } from '../../types';

import { Hono } from 'hono';

export const statsRouter = new Hono<{ Bindings: Env }>();

statsRouter.get('/ping', (c) =>
  c.json({ service: 'stats', status: 'ok', timestamp: new Date().toISOString() })
);

// ─── Shared data layer ────────────────────────────────────────────────────────

export async function buildStatsPayload(db: D1Database, environment: string) {
  const [
    totalLeaks,
    leaksBySeverity,
    recentLeaks,
    enrichedLeaks,
    totalAlerts,
    alertsByStatus,
    alertsBySeverity,
    totalWebhooks,
    enabledWebhooks,
    deliveryStats,
    activeUsers,
    lastJob,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS count FROM leak_records').first<{ count: number }>(),

    db
      .prepare(
        'SELECT severity, COUNT(*) AS count FROM leak_records GROUP BY severity ORDER BY count DESC'
      )
      .all<{ severity: string; count: number }>(),

    db
      .prepare(
        "SELECT COUNT(*) AS count FROM leak_records WHERE created_at >= datetime('now', '-1 day')"
      )
      .first<{ count: number }>(),

    db
      .prepare('SELECT COUNT(*) AS count FROM leak_records WHERE enriched = 1')
      .first<{ count: number }>(),

    db.prepare('SELECT COUNT(*) AS count FROM alerts').first<{ count: number }>(),

    db
      .prepare('SELECT status, COUNT(*) AS count FROM alerts GROUP BY status ORDER BY count DESC')
      .all<{ status: string; count: number }>(),

    db
      .prepare(
        'SELECT severity, COUNT(*) AS count FROM alerts GROUP BY severity ORDER BY count DESC'
      )
      .all<{ severity: string; count: number }>(),

    db.prepare('SELECT COUNT(*) AS count FROM webhooks').first<{ count: number }>(),

    db
      .prepare('SELECT COUNT(*) AS count FROM webhooks WHERE enabled = 1')
      .first<{ count: number }>(),

    db
      .prepare('SELECT COUNT(*) AS total, SUM(success) AS successful FROM webhook_deliveries')
      .first<{ total: number; successful: number | null }>(),

    db.prepare('SELECT COUNT(*) AS count FROM users WHERE active = 1').first<{ count: number }>(),

    db
      .prepare(
        'SELECT source, started_at, finished_at, records_fetched, records_inserted FROM collector_jobs ORDER BY started_at DESC LIMIT 1'
      )
      .first<{
        source: string;
        started_at: string;
        finished_at: string | null;
        records_fetched: number;
        records_inserted: number;
      }>(),
  ]);

  const deliveryTotal = deliveryStats?.total ?? 0;
  const deliverySuccess = deliveryStats?.successful ?? 0;

  return {
    timestamp: new Date().toISOString(),
    environment,
    leakRecords: {
      total: totalLeaks?.count ?? 0,
      last24h: recentLeaks?.count ?? 0,
      enriched: enrichedLeaks?.count ?? 0,
      bySeverity: Object.fromEntries(
        leaksBySeverity.results.map((r) => [r.severity, r.count])
      ) as Record<string, number>,
    },
    alerts: {
      total: totalAlerts?.count ?? 0,
      byStatus: Object.fromEntries(
        alertsByStatus.results.map((r) => [r.status, r.count])
      ) as Record<string, number>,
      bySeverity: Object.fromEntries(
        alertsBySeverity.results.map((r) => [r.severity, r.count])
      ) as Record<string, number>,
    },
    webhooks: {
      total: totalWebhooks?.count ?? 0,
      enabled: enabledWebhooks?.count ?? 0,
      deliveries: {
        total: deliveryTotal,
        successful: deliverySuccess,
        successRate:
          deliveryTotal > 0
            ? parseFloat(((deliverySuccess / deliveryTotal) * 100).toFixed(1))
            : null,
      },
    },
    users: { active: activeUsers?.count ?? 0 },
    collector: { lastJob: lastJob ?? null },
  };
}

// ─── API route ────────────────────────────────────────────────────────────────

// Public stats endpoint – rate-limited by the /api/v1/* middleware in index.ts.
// In production, add authMiddleware before this handler.
statsRouter.get('/', async (c) => {
  try {
    const payload = await buildStatsPayload(c.env.DB, c.env.ENVIRONMENT);
    return c.json(payload, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('no such table')) {
      return c.json(
        { error: 'Database schema not initialized', hint: 'Run migrations first' },
        503
      );
    }
    return c.json({ error: 'Internal server error', detail: message }, 500);
  }
});
