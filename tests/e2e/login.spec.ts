import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('shows login page at /login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ToadGuard')).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByText('Continue with GitHub')).toBeVisible();
  });

  test('clicking Google redirects to OAuth endpoint', async ({ page }) => {
    await page.goto('/login');
    await page.route('/auth/login**', (route) => {
      route.fulfill({ status: 302, headers: { Location: '/login?error=mock' } });
    });
    await page.click('text=Continue with Google');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user sees dashboard', async ({ page }) => {
    const fakeJwt = buildFakeJwt({ sub: 'u1', email: 'test@example.com', roles: ['VIEWER'], exp: Math.floor(Date.now() / 1000) + 3600 });
    await page.goto('/login');
    await page.evaluate((token) => localStorage.setItem('toadguard_token', token), fakeJwt);
    await page.goto('/dashboard');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });
});

function buildFakeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(payload)}.fakesignature`;
}
