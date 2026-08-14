import type { Env } from '../../types';

import { Hono } from 'hono';

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.get('/', async (c) => {
  const start = Date.now();
  let dbLatencyMs: number | null = null;
  try {
    await c.env.DB.prepare('SELECT 1').first();
    dbLatencyMs = Date.now() - start;
  } catch {
    // non-fatal
  }

  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    dbLatencyMs,
    timestamp: new Date().toISOString(),
  });
});
