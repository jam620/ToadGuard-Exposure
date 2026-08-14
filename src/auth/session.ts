const SESSION_TTL_SECONDS = 600;

export async function saveState(
  kv: KVNamespace,
  state: string,
  data: Record<string, string>
): Promise<void> {
  await kv.put(`oauth:state:${state}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

export async function consumeState(
  kv: KVNamespace,
  state: string
): Promise<Record<string, string> | null> {
  const raw = await kv.get(`oauth:state:${state}`);
  if (!raw) return null;
  await kv.delete(`oauth:state:${state}`);
  return JSON.parse(raw) as Record<string, string>;
}
