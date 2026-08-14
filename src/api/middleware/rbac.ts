import type { Context, MiddlewareHandler } from 'hono';
import type { Env, JwtPayload, Role } from '../../types';

import { hasRole } from '../../auth/rbac';

export function requireRole(...roles: Role[]): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next) => {
    const payload = c.get('jwtPayload') as JwtPayload | undefined;
    if (!payload) {
      return c.json(
        { type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'Not authenticated' },
        401
      );
    }
    if (!hasRole(payload.roles, roles)) {
      return c.json(
        {
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          detail: `Requires one of: ${roles.join(', ')}`,
        },
        403
      );
    }
    await next();
  };
}
