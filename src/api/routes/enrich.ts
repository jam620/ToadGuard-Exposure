import type { Env, LeakRecord, Severity } from '../../types';

import { Hono } from 'hono';
import { z } from 'zod';

import { enrich } from '../../detector/enrichment';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

export const enrichRouter = new Hono<{ Bindings: Env }>();

enrichRouter.use('*', authMiddleware);
enrichRouter.use('*', requireRole('ADMIN', 'ANALYST'));

const iocSchema = z.object({
  type: z.enum(['ip', 'domain', 'hash']),
  value: z.string().min(1),
});

enrichRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = iocSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { type: 'about:blank', title: 'Bad Request', status: 400, detail: parsed.error.message },
      400
    );
  }

  const { type, value } = parsed.data;
  const now = new Date().toISOString();

  const syntheticRecord: LeakRecord = {
    id: crypto.randomUUID(),
    sourceId: 'on-demand',
    sourceName: 'on-demand',
    collectedAt: now,
    normalizedAt: now,
    dedupeKey: `on-demand-${type}-${value}`,
    ipAddress: type === 'ip' ? value : undefined,
    domain: type === 'domain' ? value : undefined,
    rawData: JSON.stringify({ type, value }),
    tags: ['on-demand', type],
    severity: 'INFO' as Severity,
    enriched: false,
  };

  const result = await enrich(syntheticRecord, c.env.OTX_API_KEY, c.env.ABUSEIPDB_API_KEY);
  return c.json(result);
});
