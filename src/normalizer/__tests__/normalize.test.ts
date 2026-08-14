import { describe, expect, it } from 'vitest';

import { normalize } from '../index';

describe('normalize', () => {
  it('maps email and password_hash fields correctly', async () => {
    const raw = {
      email: 'test@example.com',
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRS',
      source: 'simulated',
      tags: ['darkweb'],
    };
    const { record, warnings, droppedFields } = await normalize(raw, 'simulated');

    expect(record.email).toBe('test@example.com');
    expect(record.passwordHash).toBe(raw.password_hash);
    expect(record.severity).toBe('HIGH');
    expect(record.sourceId).toBe('simulated');
    expect(record.dedupeKey).toMatch(/^[0-9a-f]{64}$/);
    expect(warnings).toEqual([]);
    expect(droppedFields).toEqual([]);
  });

  it('drops plaintext password and records it', async () => {
    const raw = { email: 'a@b.com', password: 'secret123', source: 'test', tags: [] };
    const { droppedFields, record } = await normalize(raw, 'test');

    expect(droppedFields).toContain('passwordPlain');
    expect(record.passwordHash).toBeUndefined();
  });

  it('warns when record has no email, IP, or domain', async () => {
    const raw = { username: 'ghost', source: 'test', tags: [] };
    const { warnings } = await normalize(raw, 'test');

    expect(warnings.some((w) => w.includes('no email'))).toBe(true);
  });

  it('assigns INFO severity when no sensitive fields present', async () => {
    const raw = { username: 'nobody', source: 'rss', tags: ['rss'] };
    const { record } = await normalize(raw, 'rss');

    expect(record.severity).toBe('INFO');
  });

  it('throws ZodError on invalid email format', async () => {
    const raw = { email: 'not-an-email', source: 'test', tags: [] };
    await expect(normalize(raw, 'test')).rejects.toThrow();
  });

  it('includes source in tags', async () => {
    const raw = { domain: 'example.com', source: 'hibp', tags: [] };
    const { record } = await normalize(raw, 'hibp');

    expect(record.tags).toContain('hibp');
  });
});
