import type { Env, JwtPayload, PaginatedResponse, Webhook, WebhookDelivery } from '../../types';

import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

export const webhooksRouter = new Hono<{ Bindings: Env }>();

webhooksRouter.use('*', authMiddleware);

const webhookSchema = z.object({
  name: z.string().min(1),
  targetUrl: z.string().url(),
  secret: z.string().min(8),
  format: z.enum(['JSON', 'CEF']).default('JSON'),
  enabled: z.boolean().default(true),
  minSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('LOW'),
});

webhooksRouter.get('/', requireRole('ADMIN', 'ANALYST'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, name, target_url, format, enabled, min_severity, created_at, updated_at, created_by
     FROM webhooks ORDER BY created_at DESC`
  ).all<Omit<Webhook, 'secret'>>();

  return c.json({
    data: rows.results,
    total: rows.results.length,
    page: 1,
    pageSize: 100,
    hasNext: false,
  } satisfies PaginatedResponse<Omit<Webhook, 'secret'>>);
});

webhooksRouter.post('/', requireRole('ADMIN'), async (c) => {
  const body = await c.req.json();
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { type: 'about:blank', title: 'Bad Request', status: 400, detail: parsed.error.message },
      400
    );
  }

  const jwtPayload = c.get('jwtPayload') as JwtPayload;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { name, targetUrl, secret, format, enabled, minSeverity } = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO webhooks (id, name, target_url, secret, format, enabled, min_severity, created_at, updated_at, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      id,
      name,
      targetUrl,
      secret,
      format,
      enabled ? 1 : 0,
      minSeverity,
      now,
      now,
      jwtPayload.sub
    )
    .run();

  return c.json(
    { id, name, targetUrl, format, enabled, minSeverity, createdAt: now, updatedAt: now },
    201
  );
});

webhooksRouter.get('/:id', requireRole('ADMIN', 'ANALYST'), async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT id, name, target_url, format, enabled, min_severity, created_at, updated_at, created_by
     FROM webhooks WHERE id=?`
  )
    .bind(c.req.param('id'))
    .first<Omit<Webhook, 'secret'>>();

  if (!row)
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Webhook not found' },
      404
    );
  return c.json(row);
});

webhooksRouter.put('/:id', requireRole('ADMIN'), async (c) => {
  const body = await c.req.json();
  const parsed = webhookSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json(
      { type: 'about:blank', title: 'Bad Request', status: 400, detail: parsed.error.message },
      400
    );
  }

  const { name, targetUrl, secret, format, enabled, minSeverity } = parsed.data;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE webhooks SET name=COALESCE(?,name), target_url=COALESCE(?,target_url),
     secret=COALESCE(?,secret), format=COALESCE(?,format), enabled=COALESCE(?,enabled),
     min_severity=COALESCE(?,min_severity), updated_at=? WHERE id=?`
  )
    .bind(
      name ?? null,
      targetUrl ?? null,
      secret ?? null,
      format ?? null,
      enabled !== undefined ? (enabled ? 1 : 0) : null,
      minSeverity ?? null,
      now,
      c.req.param('id')
    )
    .run();

  return c.json({ updated: true });
});

webhooksRouter.delete('/:id', requireRole('ADMIN'), async (c) => {
  await c.env.DB.prepare('DELETE FROM webhooks WHERE id=?').bind(c.req.param('id')).run();
  return c.body(null, 204);
});

webhooksRouter.post('/:id/test', requireRole('ADMIN'), async (c) => {
  const webhook = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id=?')
    .bind(c.req.param('id'))
    .first<Webhook>();

  if (!webhook)
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Webhook not found' },
      404
    );

  const { dispatch } = await import('../../webhooks/dispatcher');
  const fakeAlert = {
    id: 'test-alert',
    recordId: 'test-record',
    ruleId: 'rule-001',
    ruleName: 'Test',
    severity: 'INFO' as const,
    status: 'OPEN' as const,
    compositeScore: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dispatch(fakeAlert, c.env);
  return c.json({ dispatched: true });
});

webhooksRouter.get('/:id/deliveries', requireRole('ADMIN', 'ANALYST'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT * FROM webhook_deliveries WHERE webhook_id=? ORDER BY delivered_at DESC LIMIT 50`
  )
    .bind(c.req.param('id'))
    .all<WebhookDelivery>();

  return c.json({
    data: rows.results,
    total: rows.results.length,
    page: 1,
    pageSize: 50,
    hasNext: false,
  });
});
