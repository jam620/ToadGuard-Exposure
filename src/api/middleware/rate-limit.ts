import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../../types';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export function rateLimitMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
    const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
    const key = `ratelimit:${ip}:${window}`;

    const current = await c.env.KV.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= MAX_REQUESTS) {
      return c.json(
        {
          type: 'about:blank',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Rate limit exceeded',
        },
        429,
        { 'Retry-After': String(WINDOW_SECONDS) }
      );
    }

    await c.env.KV.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS * 2 });
    await next();
  };
}
