import type { Context } from 'hono';

import { HTTPException } from 'hono/http-exception';

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json(
      {
        type: 'about:blank',
        title: err.message,
        status: err.status,
        detail: err.message,
        instance: c.req.path,
      },
      err.status
    );
  }

  return c.json(
    {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: c.req.path,
    },
    500
  );
}
