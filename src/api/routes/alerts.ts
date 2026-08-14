import type { Alert, Env, JwtPayload, PaginatedResponse } from '../../types';

import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

export const alertsRouter = new Hono<{ Bindings: Env }>();

alertsRouter.use('*', authMiddleware);

alertsRouter.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '25', 10)));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  const status = c.req.query('status');
  if (status) {
    conditions.push('status = ?');
    bindings.push(status);
  }

  const severity = c.req.query('severity');
  if (severity) {
    conditions.push('severity = ?');
    bindings.push(severity);
  }

  const from = c.req.query('from');
  if (from) {
    conditions.push('created_at >= ?');
    bindings.push(from);
  }

  const to = c.req.query('to');
  if (to) {
    conditions.push('created_at <= ?');
    bindings.push(to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM alerts ${where}`)
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countRow?.total ?? 0;

  const rows = await c.env.DB.prepare(
    `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...bindings, pageSize, offset)
    .all<Alert>();

  const response: PaginatedResponse<Alert> = {
    data: rows.results,
    total,
    page,
    pageSize,
    hasNext: offset + pageSize < total,
  };

  return c.json(response);
});

alertsRouter.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM alerts WHERE id = ?')
    .bind(c.req.param('id'))
    .first<Alert>();

  if (!row)
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Alert not found' },
      404
    );

  return c.json(row);
});

const patchSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'DISMISSED', 'RESOLVED']).optional(),
  notes: z.string().optional(),
});

alertsRouter.patch('/:id', requireRole('ADMIN', 'ANALYST'), async (c) => {
  const body = await c.req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { type: 'about:blank', title: 'Bad Request', status: 400, detail: parsed.error.message },
      400
    );
  }

  const { status, notes } = parsed.data;
  const jwtPayload = c.get('jwtPayload') as JwtPayload;
  const now = new Date().toISOString();

  if (status) {
    await c.env.DB.prepare(
      `UPDATE alerts SET status=?, acknowledged_by=?, notes=COALESCE(?,notes), updated_at=? WHERE id=?`
    )
      .bind(status, jwtPayload.sub, notes ?? null, now, c.req.param('id'))
      .run();
  } else if (notes) {
    await c.env.DB.prepare(`UPDATE alerts SET notes=?, updated_at=? WHERE id=?`)
      .bind(notes, now, c.req.param('id'))
      .run();
  }

  const updated = await c.env.DB.prepare('SELECT * FROM alerts WHERE id=?')
    .bind(c.req.param('id'))
    .first<Alert>();

  if (!updated)
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Alert not found' },
      404
    );

  return c.json(updated);
});
