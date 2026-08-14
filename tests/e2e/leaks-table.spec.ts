import { test, expect } from '@playwright/test';

function buildFakeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(payload)}.fakesig`;
}

const FAKE_TOKEN = buildFakeJwt({ sub: 'u1', email: 'analyst@example.com', roles: ['ANALYST'], exp: Math.floor(Date.now() / 1000) + 3600 });

const MOCK_LEAKS = {
  data: [
    { id: 'lr-1', email: 'alice@example.com', domain: 'example.com', sourceName: 'simulated', severity: 'HIGH', collectedAt: new Date().toISOString(), enriched: false, tags: [], sourceId: 'simulated', normalizedAt: new Date().toISOString(), dedupeKey: 'key1', rawData: '{}' },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
  hasNext: false,
};

test.beforeEach(async ({ page }) => {
  await page.route('/api/v1/leaks**', (route) => route.fulfill({ json: MOCK_LEAKS }));
  await page.route('/api/v1/alerts**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, pageSize: 25, hasNext: false } }));
  await page.evaluate((token) => localStorage.setItem('toadguard_token', token), FAKE_TOKEN);
});

test('leaks page renders table rows', async ({ page }) => {
  await page.goto('/leaks');
  await expect(page.getByText('alice@example.com')).toBeVisible();
  await expect(page.getByText('example.com')).toBeVisible();
});

test('leaks page shows total count', async ({ page }) => {
  await page.goto('/leaks');
  await expect(page.getByText('1 total results')).toBeVisible();
});
