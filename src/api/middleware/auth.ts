import type { Context, Next } from 'hono';
import type { Env, JwtPayload } from '../../types';

import { verifyJwt } from '../../auth/jwt';

export async function authMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'Missing Bearer token' },
      401
    );
  }

  const token = authHeader.slice(7);
  const publicKey = c.env.JWT_PUBLIC_KEY;
  if (!publicKey) {
    return c.json(
      { type: 'about:blank', title: 'Server Error', status: 500, detail: 'JWT key not configured' },
      500
    );
  }

  let payload: JwtPayload;
  try {
    payload = await verifyJwt(token, publicKey);
  } catch {
    return c.json(
      {
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid or expired token',
      },
      401
    );
  }

  c.set('jwtPayload', payload);
  await next();
}
