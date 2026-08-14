import { Hono } from 'hono';

const app = new Hono();

app.get('/hibp/latestbreaches', (c) => {
  return c.json([
    { Domain: 'breached.com', Name: 'TestBreach', DataClasses: ['Passwords', 'Emails'] },
    { Domain: 'leaked.net', Name: 'LeakedNet', DataClasses: ['Usernames'] },
  ]);
});

app.get('/rss', (c) => {
  return c.text(`<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Threat Intel Feed</title>
    <item><title>Malware Campaign</title><link>http://malicious.example.com/feed/1</link></item>
    <item><title>Ransomware IOCs</title><link>http://ransomware.example.net/feed/2</link></item>
  </channel>
</rss>`);
});

app.get('/telegram/bot:token/getUpdates', (c) => {
  return c.json({
    ok: true,
    result: [
      { message: { text: 'Found credentials: user@company.com / $2b$10$ABCDEFGHIJKLMNOPQRSTUVuvwxyz01234567890123456789012' } },
      { message: { text: 'Regular chatter message with no IOCs' } },
    ],
  });
});

export default app;

if (typeof Bun !== 'undefined') {
  Bun.serve({ port: 9999, fetch: app.fetch });
  console.log('Mock server running on :9999');
}
