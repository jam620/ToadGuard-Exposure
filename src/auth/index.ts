import type { Env, JwtPayload, Role } from '../types';

import { signJwt } from './jwt';
import { getProvider } from './oauth-providers';
import { ROLES } from './rbac';
import { consumeState, saveState } from './session';

const JWT_EXPIRY_SECONDS = 3600 * 8;

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const providerName = url.searchParams.get('provider') ?? 'google';

  let provider;
  try {
    provider = getProvider(providerName, env as unknown as Record<string, string | undefined>);
  } catch {
    return new Response('Unknown provider', { status: 400 });
  }

  const state = crypto.randomUUID();
  const redirectUri = `${env.OAUTH_REDIRECT_BASE_URL}/auth/callback`;

  await saveState(env.KV, state, { provider: providerName, redirectUri });

  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state,
  });

  return Response.redirect(`${provider.authUrl}?${params}`, 302);
}

export async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return new Response('Missing code or state', { status: 400 });

  const sessionData = await consumeState(env.KV, state);
  if (!sessionData) return new Response('Invalid or expired state', { status: 400 });

  const provider = getProvider(
    sessionData['provider'] ?? 'google',
    env as unknown as Record<string, string | undefined>
  );

  const tokenResponse = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: sessionData['redirectUri'] ?? '',
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
    }),
  });

  if (!tokenResponse.ok) return new Response('Token exchange failed', { status: 502 });

  const tokens = (await tokenResponse.json()) as { access_token: string };

  const userInfoResponse = await fetch(provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) return new Response('Failed to fetch user info', { status: 502 });

  const userInfo = (await userInfoResponse.json()) as {
    sub?: string;
    id?: string;
    email: string;
    name?: string;
    login?: string;
  };

  const oauthSubject = userInfo.sub ?? String(userInfo.id ?? '');
  const email = userInfo.email;
  const displayName = userInfo.name ?? userInfo.login ?? email;

  let user = await env.DB.prepare(`SELECT id FROM users WHERE oauth_provider=? AND oauth_subject=?`)
    .bind(provider.name, oauthSubject)
    .first<{ id: string }>();

  if (!user) {
    const userId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO users (id, email, display_name, oauth_provider, oauth_subject) VALUES (?,?,?,?,?)`
    )
      .bind(userId, email, displayName, provider.name, oauthSubject)
      .run();
    await env.DB.prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, 'role_viewer')`)
      .bind(userId)
      .run();
    user = { id: userId };
  } else {
    await env.DB.prepare(`UPDATE users SET last_login_at=datetime('now') WHERE id=?`)
      .bind(user.id)
      .run();
  }

  const roleRows = await env.DB.prepare(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?`
  )
    .bind(user.id)
    .all<{ name: string }>();

  const roles = roleRows.results.map((r) => r.name as Role);

  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    email,
    roles,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
    jti: crypto.randomUUID(),
  };

  if (!env.JWT_PRIVATE_KEY) return new Response('JWT key not configured', { status: 500 });

  const token = await signJwt(payload, env.JWT_PRIVATE_KEY);

  const redirectUrl = new URL('/dashboard', env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:5173');
  redirectUrl.searchParams.set('token', token);
  return Response.redirect(redirectUrl.toString(), 302);
}

export async function handleMe(jwtPayload: JwtPayload): Promise<Response> {
  return new Response(
    JSON.stringify({ id: jwtPayload.sub, email: jwtPayload.email, roles: jwtPayload.roles }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export { ROLES };
