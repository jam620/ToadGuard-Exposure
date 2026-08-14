# Auth — OAuth 2.0 & RBAC

## OAuth 2.0 Flow

```
Browser → GET /auth/login?provider=google
        ← 302 → Google Auth
Google  → GET /auth/callback?code=X&state=Y
        ← 302 → /dashboard?token=JWT
```

1. `/auth/login` saves a PKCE-like `state` to KV (TTL 10 min), then redirects to provider.
2. `/auth/callback` validates `state`, exchanges `code` for access token, fetches user info, upserts user in D1, issues RS256 JWT.
3. Frontend stores JWT in `localStorage` and includes it as `Authorization: Bearer <token>` on every API call.

## RBAC Role Matrix

| Permission | ADMIN | ANALYST | VIEWER |
|-----------|-------|---------|--------|
| leaks:read | ✅ | ✅ | ✅ |
| alerts:read | ✅ | ✅ | ✅ |
| alerts:write | ✅ | ✅ | ❌ |
| enrich:execute | ✅ | ✅ | ❌ |
| config:read | ✅ | ✅ | ❌ |
| config:write | ✅ | ❌ | ❌ |
| webhooks:read | ✅ | ✅ | ❌ |
| webhooks:write | ✅ | ❌ | ❌ |
| users:read | ✅ | ❌ | ❌ |
| users:write | ✅ | ❌ | ❌ |

## JWT Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["ANALYST"],
  "iat": 1700000000,
  "exp": 1700028800,
  "jti": "unique-token-id"
}
```

Algorithm: RS256. Keys set via `wrangler secret put JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`.
