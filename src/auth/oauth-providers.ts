export interface OAuthProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
}

export function getProvider(name: string, env: Record<string, string | undefined>): OAuthProvider {
  switch (name) {
    case 'google':
      return {
        name: 'google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scopes: ['openid', 'email', 'profile'],
        clientId: env['OAUTH_GOOGLE_CLIENT_ID'] ?? '',
        clientSecret: env['OAUTH_GOOGLE_CLIENT_SECRET'] ?? '',
      };
    case 'github':
      return {
        name: 'github',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['read:user', 'user:email'],
        clientId: env['OAUTH_GITHUB_CLIENT_ID'] ?? '',
        clientSecret: env['OAUTH_GITHUB_CLIENT_SECRET'] ?? '',
      };
    default:
      throw new Error(`Unknown OAuth provider: ${name}`);
  }
}
