import type { Env } from '../types';

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { handleCallback, handleLogin, handleMe } from '../auth';
import { runCollector } from '../collector';
import { logStageError, sanitizeErrorMessage } from '../debug-log';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { alertsRouter } from './routes/alerts';
import { dashboardRouter } from './routes/dashboard';
import { configRouter } from './routes/config';
import { enrichRouter } from './routes/enrich';
import { healthRouter } from './routes/health';
import { leaksRouter } from './routes/leaks';
import { leaksViewRouter } from './routes/leaks-view';
import { statsRouter } from './routes/stats';
import { usersRouter } from './routes/users';
import { webhooksRouter } from './routes/webhooks';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use('/api/v1/*', rateLimitMiddleware());

app.get('/_health', (c) => c.json({ status: 'ok' }));

// Staging-only manual pipeline trigger – remove before production
app.post('/_trigger', async (c) => {
  if (c.env.ENVIRONMENT === 'production') return c.json({ error: 'Forbidden' }, 403);

  try {
    const summary = await runCollector(c.env);
    return c.json({ triggered: true, ...summary });
  } catch (err) {
    logStageError('trigger', 'runCollector', err);

    // Staging-only: surface a sanitized detail so the failure is visible
    // without needing wrangler tail. Never reaches production (checked above).
    const message = err instanceof Error ? err.message : String(err);
    return c.json(
      {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: `staging debug: ${sanitizeErrorMessage(message)}`,
        instance: '/_trigger',
      },
      500
    );
  }
});

app.get('/api/v1/health', (c) => healthRouter.fetch(c.req.raw, c.env));

app.get('/auth/login', (c) => handleLogin(c.req.raw, c.env));
app.get('/auth/callback', (c) => handleCallback(c.req.raw, c.env));
app.post('/auth/logout', authMiddleware, (c) => c.json({ loggedOut: true }));
app.get('/auth/me', authMiddleware, (c) => {
  const payload = c.get('jwtPayload');
  return handleMe(payload);
});

app.route('/dashboard', dashboardRouter);
app.route('/leaks', leaksViewRouter);
app.route('/api/v1/leaks', leaksRouter);
app.route('/api/v1/stats', statsRouter);
app.route('/api/v1/alerts', alertsRouter);
app.route('/api/v1/enrich', enrichRouter);
app.route('/api/v1/config', configRouter);
app.route('/api/v1/webhooks', webhooksRouter);
app.route('/api/v1/users', usersRouter);

app.onError(errorHandler);

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runCollector(env);
  },
};
