import { test, expect } from '@playwright/test';

function buildFakeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(payload)}.fakesig`;
}

const FAKE_TOKEN = buildFakeJwt({ sub: 'u1', email: 'analyst@example.com', roles: ['ANALYST'], exp: Math.floor(Date.now() / 1000) + 3600 });

const OPEN_ALERT = { id: 'a1', ruleName: 'Test Rule', severity: 'HIGH', status: 'OPEN', compositeScore: 70, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), recordId: 'r1', ruleId: 'rule-001' };
const ACK_ALERT = { ...OPEN_ALERT, status: 'ACKNOWLEDGED' };

test('acknowledge an alert changes status optimistically', async ({ page }) => {
  let ackCalled = false;

  await page.route('/api/v1/alerts**', (route) => {
    if (route.request().method() === 'PATCH') {
      ackCalled = true;
      route.fulfill({ json: ACK_ALERT });
    } else {
      route.fulfill({ json: { data: [OPEN_ALERT], total: 1, page: 1, pageSize: 25, hasNext: false } });
    }
  });

  await page.evaluate((token) => localStorage.setItem('toadguard_token', token), FAKE_TOKEN);
  await page.goto('/alerts');

  await expect(page.getByText('Test Rule')).toBeVisible();
  await page.click('text=Acknowledge');

  expect(ackCalled).toBe(true);
});
