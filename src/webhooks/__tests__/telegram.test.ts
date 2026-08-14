import type { Alert, Env, LeakRecord } from '../../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendTelegramNotification, type AlertNotificationContext } from '../telegram';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    ENVIRONMENT: 'test',
    HIBP_BASE_URL: '',
    RSS_FEED_URL: '',
    JWT_ALGORITHM: 'RS256',
    TELEGRAM_BOT_TOKEN: 'bot-token',
    TELEGRAM_CHAT_IDS: JSON.stringify(['111']),
    OAUTH_REDIRECT_BASE_URL: 'https://toadguard-exposure-staging.security-headers-test.workers.dev',
    ...overrides,
  };
}

function makeRecord(overrides: Partial<LeakRecord> = {}): LeakRecord {
  return {
    id: 'r1',
    sourceId: 'simulated',
    sourceName: 'simulated',
    collectedAt: '2024-01-01T00:00:00Z',
    normalizedAt: '2024-01-01T00:00:00Z',
    dedupeKey: 'abc',
    rawData: '{}',
    tags: [],
    severity: 'CRITICAL',
    enriched: false,
    ...overrides,
  };
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    recordId: 'r1',
    ruleId: 'rule-005',
    ruleName: 'Multi-field Credential Combo',
    severity: 'CRITICAL',
    status: 'OPEN',
    compositeScore: 80,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendTelegramNotification', () => {
  it('no-ops when the bot token is missing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const record = makeRecord({ email: 'victim@corp.io' });
    const env = makeEnv();
    delete env.TELEGRAM_BOT_TOKEN;
    await sendTelegramNotification([{ alert: makeAlert(), record }], env);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('no-ops when chat IDs are malformed JSON', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const record = makeRecord({ email: 'victim@corp.io' });
    await sendTelegramNotification(
      [{ alert: makeAlert(), record }],
      makeEnv({ TELEGRAM_CHAT_IDS: 'not-json' })
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('no-ops when there are no contexts', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await sendTelegramNotification([], makeEnv());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('groups multiple rule matches on the same indicator into one entry', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetchSpy);

    const record = makeRecord({ email: 'victim@corp.io', sourceName: 'simulated' });
    const contexts: AlertNotificationContext[] = [
      {
        alert: makeAlert({
          id: 'a1',
          ruleName: 'Multi-field Credential Combo',
          compositeScore: 80,
        }),
        record,
      },
      {
        alert: makeAlert({ id: 'a2', ruleName: 'Corporate Email Exposure', compositeScore: 75 }),
        record,
      },
    ];

    await sendTelegramNotification(contexts, makeEnv());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { text: string };

    expect(body.text).toContain('2 CRITICAL alerts (1 indicador)');
    expect(body.text.match(/victim@corp\.io/g)).toHaveLength(1);
    expect(body.text).toContain('Multi-field Credential Combo — score: 80/100');
    expect(body.text).toContain('Corporate Email Exposure — score: 75/100');
    expect(body.text).toContain('fuente: `simulated`');
  });

  it('keeps distinct indicators as separate groups', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetchSpy);

    const contexts: AlertNotificationContext[] = [
      { alert: makeAlert({ id: 'a1' }), record: makeRecord({ id: 'r1', email: 'victim@corp.io' }) },
      { alert: makeAlert({ id: 'a2' }), record: makeRecord({ id: 'r2', email: 'other@corp.io' }) },
    ];

    await sendTelegramNotification(contexts, makeEnv());

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { text: string };

    expect(body.text).toContain('2 CRITICAL alerts (2 indicadores)');
    expect(body.text).toContain('victim@corp.io');
    expect(body.text).toContain('other@corp.io');
  });

  it('links to the CRITICAL leaks view using the app base URL', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetchSpy);

    const record = makeRecord({ email: 'victim@corp.io' });
    await sendTelegramNotification(
      [{ alert: makeAlert(), record }],
      makeEnv({
        OAUTH_REDIRECT_BASE_URL:
          'https://toadguard-exposure-staging.security-headers-test.workers.dev',
      })
    );

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { text: string };

    expect(body.text).toContain(
      'https://toadguard-exposure-staging.security-headers-test.workers.dev/leaks?severity=CRITICAL'
    );
  });

  it('sanitizes backticks in the indicator so they cannot break the code span', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetchSpy);

    const record = makeRecord({ username: 'weird`user' });
    await sendTelegramNotification([{ alert: makeAlert(), record }], makeEnv());

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { text: string };

    expect(body.text).not.toContain('`weird`user`');
    expect(body.text).toContain("weird'user");
  });

  it('posts once per configured chat ID', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetchSpy);

    const record = makeRecord({ email: 'victim@corp.io' });
    await sendTelegramNotification(
      [{ alert: makeAlert(), record }],
      makeEnv({ TELEGRAM_CHAT_IDS: JSON.stringify(['111', '222']) })
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
