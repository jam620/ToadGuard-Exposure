const DOMAINS = ['example.com', 'corp.io', 'testorg.net', 'acme.dev', 'megacorp.biz'];
const PROVIDERS = ['gmail.com', 'yahoo.com', 'outlook.com', 'proton.me'];
const TAGS = ['darkweb', 'paste', 'telegram', 'forum', 'breach'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)] as T;
}

export interface SimulatedRaw {
  email?: string;
  username?: string;
  password_hash?: string;
  ip?: string;
  domain?: string;
  source: string;
  tags: string[];
}

export function generateSimulatedRecords(count?: number): SimulatedRaw[] {
  const seed = Math.floor(Date.now() / 300_000);
  const rand = seededRandom(seed);
  const n = count ?? Math.floor(rand() * 16) + 5;

  return Array.from({ length: n }, (_, i) => {
    const domain = pick(DOMAINS, rand);
    const provider = pick(PROVIDERS, rand);
    const username = `user${Math.floor(rand() * 9000) + 1000}`;
    const hasEmail = rand() > 0.2;
    const hasIp = rand() > 0.5;
    const hasHash = rand() > 0.4;

    return {
      email: hasEmail ? `${username}@${provider}` : undefined,
      username,
      password_hash: hasHash
        ? `$2b$10$${Array.from({ length: 53 }, () => Math.floor(rand() * 36).toString(36)).join('')}`
        : undefined,
      ip: hasIp
        ? `${Math.floor(rand() * 200) + 10}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}`
        : undefined,
      domain: rand() > 0.3 ? domain : undefined,
      source: 'simulated',
      tags: [pick(TAGS, rand), `seed-${seed}`, `idx-${i}`],
    };
  });
}
