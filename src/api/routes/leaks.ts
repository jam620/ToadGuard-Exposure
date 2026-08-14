import type { Env, LeakRecord, PaginatedResponse } from '../../types';

import { Hono } from 'hono';

import { authMiddleware } from '../middleware/auth';

export const leaksRouter = new Hono<{ Bindings: Env }>();

// ─── Shared data layer ────────────────────────────────────────────────────────

export type LeakRow = {
  id: string;
  source_id: string;
  source_name: string;
  email: string | null;
  username: string | null;
  password_hash: string | null;
  ip_address: string | null;
  domain: string | null;
  severity: string;
  enriched: number;
  collected_at: string;
  tags: string;
};

export type LeaksFilters = {
  severity?: string;
  source?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function buildLeaksPayload(db: D1Database, filters: LeaksFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (filters.severity) {
    conditions.push('severity = ?');
    bindings.push(filters.severity);
  }
  if (filters.source) {
    conditions.push('source_id = ?');
    bindings.push(filters.source);
  }
  if (filters.from) {
    conditions.push('collected_at >= ?');
    bindings.push(filters.from);
  }
  if (filters.to) {
    conditions.push('collected_at <= ?');
    bindings.push(filters.to);
  }
  if (filters.q) {
    conditions.push('(email LIKE ? OR domain LIKE ? OR username LIKE ?)');
    bindings.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRow, rows] = await Promise.all([
    db
      .prepare(`SELECT COUNT(*) AS total FROM leak_records ${where}`)
      .bind(...bindings)
      .first<{ total: number }>(),
    db
      .prepare(
        `SELECT id, source_id, source_name, email, username, password_hash,
                ip_address, domain, severity, enriched, collected_at, tags
         FROM leak_records ${where} ORDER BY collected_at DESC LIMIT ? OFFSET ?`
      )
      .bind(...bindings, pageSize, offset)
      .all<LeakRow>(),
  ]);

  const total = countRow?.total ?? 0;

  return {
    rows: rows.results,
    total,
    page,
    pageSize,
    hasNext: offset + rows.results.length < total,
    hasPrev: page > 1,
    filters,
  };
}

// ─── API routes (auth-protected) ─────────────────────────────────────────────

leaksRouter.use('*', authMiddleware);

leaksRouter.get('/', async (c) => {
  const filters: LeaksFilters = {
    severity: c.req.query('severity'),
    source: c.req.query('source'),
    from: c.req.query('from'),
    to: c.req.query('to'),
    q: c.req.query('q'),
    page: parseInt(c.req.query('page') ?? '1', 10),
    pageSize: parseInt(c.req.query('pageSize') ?? '25', 10),
  };

  const { rows, total, page, pageSize, hasNext } = await buildLeaksPayload(c.env.DB, filters);

  const response: PaginatedResponse<LeakRecord> = {
    data: rows as unknown as LeakRecord[],
    total,
    page,
    pageSize,
    hasNext,
  };

  return c.json(response);
});

leaksRouter.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM leak_records WHERE id = ?')
    .bind(c.req.param('id'))
    .first<LeakRecord>();

  if (!row)
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Leak not found' },
      404
    );

  const enrichment = await c.env.DB.prepare('SELECT * FROM enrichment_results WHERE record_id = ?')
    .bind(row.id)
    .first();

  return c.json({ ...row, enrichment });
});

leaksRouter.post('/:id/enrich', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM leak_records WHERE id = ?')
    .bind(c.req.param('id'))
    .first<LeakRecord>();

  if (!row)
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Leak not found' },
      404
    );

  const { enrich } = await import('../../detector/enrichment');
  const result = await enrich(row, c.env.OTX_API_KEY, c.env.ABUSEIPDB_API_KEY);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO enrichment_results
     (id, record_id, enriched_at, otx_pulse_count, otx_malicious, otx_categories, otx_references,
      abuse_confidence_score, abuse_isp, abuse_country_code, abuse_total_reports,
      abuse_last_reported_at, composite_score, indicators)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      id,
      result.recordId,
      result.enrichedAt,
      result.otx?.pulseCount ?? null,
      result.otx?.malicious ? 1 : null,
      result.otx ? JSON.stringify(result.otx.categories) : null,
      result.otx ? JSON.stringify(result.otx.references) : null,
      result.abuseIpDb?.abuseConfidenceScore ?? null,
      result.abuseIpDb?.isp ?? null,
      result.abuseIpDb?.countryCode ?? null,
      result.abuseIpDb?.totalReports ?? null,
      result.abuseIpDb?.lastReportedAt ?? null,
      result.compositeScore,
      JSON.stringify(result.indicators)
    )
    .run();

  await c.env.DB.prepare('UPDATE leak_records SET enriched=1 WHERE id=?').bind(row.id).run();

  return c.json(result);
});
