// Stops the cron (*/5 * * * *) from hammering a full D1 database every 5
// minutes: once a write fails with D1's size-limit error, we trip a KV flag
// so subsequent runs short-circuit for a cooldown window instead of repeating
// the same fetch + write + fail cycle (this is what drove rows_read_24h into
// the hundreds of millions).

const CIRCUIT_KEY = 'toadguard:circuit:d1-full';
const CIRCUIT_TTL_SECONDS = 900; // 15 minutes

const D1_FULL_SIGNATURE = /exceeded maximum db size/i;

export function isD1FullError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return D1_FULL_SIGNATURE.test(message);
}

export async function isCircuitOpen(kv: KVNamespace): Promise<boolean> {
  return (await kv.get(CIRCUIT_KEY)) !== null;
}

export async function tripCircuit(kv: KVNamespace): Promise<void> {
  await kv.put(CIRCUIT_KEY, new Date().toISOString(), { expirationTtl: CIRCUIT_TTL_SECONDS });
}
