import type { Env } from '../../types';

import { Hono } from 'hono';

import { rules } from '../../detector/rules';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

export const configRouter = new Hono<{ Bindings: Env }>();

configRouter.use('*', authMiddleware);

configRouter.get('/rules', requireRole('ADMIN', 'ANALYST'), async (c) => {
  return c.json(
    rules.map(({ id, name, description, severity, enabled }) => ({
      id,
      name,
      description,
      severity,
      enabled,
    }))
  );
});

configRouter.put('/rules/:ruleId', requireRole('ADMIN'), async (c) => {
  const { ruleId } = c.req.param();
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) {
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Rule not found' },
      404
    );
  }

  const body = (await c.req.json()) as { enabled?: boolean; severity?: string };
  if (typeof body.enabled === 'boolean') rule.enabled = body.enabled;

  return c.json({ id: rule.id, name: rule.name, enabled: rule.enabled, severity: rule.severity });
});

configRouter.get('/alerts', requireRole('ADMIN', 'ANALYST'), async (c) => {
  return c.json({
    rateLimitWindowSeconds: 60,
    rateLimitMaxRequests: 100,
    defaultPageSize: 25,
  });
});

configRouter.put('/alerts', requireRole('ADMIN'), async (c) => {
  return c.json({ updated: true });
});
