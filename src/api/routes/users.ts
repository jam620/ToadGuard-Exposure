import type { Env, Role, User } from '../../types';

import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

export const usersRouter = new Hono<{ Bindings: Env }>();

usersRouter.use('*', authMiddleware);
usersRouter.use('*', requireRole('ADMIN'));

usersRouter.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.oauth_provider, u.oauth_subject,
            u.created_at, u.last_login_at, u.active,
            json_group_array(r.name) as roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id ORDER BY u.created_at DESC`
  ).all<User & { roles: string }>();

  const users = rows.results.map((u) => ({
    ...u,
    roles: JSON.parse(u.roles).filter(Boolean) as Role[],
  }));

  return c.json({ data: users, total: users.length });
});

usersRouter.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.oauth_provider, u.oauth_subject,
            u.created_at, u.last_login_at, u.active,
            json_group_array(r.name) as roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id=?
     GROUP BY u.id`
  )
    .bind(c.req.param('id'))
    .first<User & { roles: string }>();

  if (!row)
    return c.json(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'User not found' },
      404
    );

  return c.json({ ...row, roles: JSON.parse(row.roles).filter(Boolean) as Role[] });
});

const patchUserSchema = z.object({
  displayName: z.string().optional(),
  active: z.boolean().optional(),
});

usersRouter.patch('/:id', async (c) => {
  const body = await c.req.json();
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { type: 'about:blank', title: 'Bad Request', status: 400, detail: parsed.error.message },
      400
    );
  }

  const { displayName, active } = parsed.data;
  await c.env.DB.prepare(
    `UPDATE users SET display_name=COALESCE(?,display_name), active=COALESCE(?,active) WHERE id=?`
  )
    .bind(displayName ?? null, active !== undefined ? (active ? 1 : 0) : null, c.req.param('id'))
    .run();

  return c.json({ updated: true });
});

usersRouter.patch('/:id/roles', async (c) => {
  const body = (await c.req.json()) as { roles: Role[] };
  const validRoles: Role[] = ['ADMIN', 'ANALYST', 'VIEWER'];
  const roles = (body.roles ?? []).filter((r) => validRoles.includes(r));

  await c.env.DB.prepare('DELETE FROM user_roles WHERE user_id=?').bind(c.req.param('id')).run();

  for (const role of roles) {
    const roleRow = await c.env.DB.prepare('SELECT id FROM roles WHERE name=?')
      .bind(role)
      .first<{ id: string }>();
    if (roleRow) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?,?)')
        .bind(c.req.param('id'), roleRow.id)
        .run();
    }
  }

  return c.json({ updated: true, roles });
});

usersRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('UPDATE users SET active=0 WHERE id=?').bind(c.req.param('id')).run();
  return c.json({ deleted: true });
});
