// Lightweight Upstash Redis REST client (or no-op memory fallback)

type KvResult<T = any> = { result: T };

function isUpstashConfigured() {
  return !!(process.env.DURABLE_STORE_URL && process.env.DURABLE_STORE_TOKEN);
}

async function upstash<T = any>(cmd: (string | number)[]): Promise<T> {
  const base = process.env.DURABLE_STORE_URL as string;
  const token = process.env.DURABLE_STORE_TOKEN as string;
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as KvResult<T>;
  return json.result;
}

const memory = new Map<string, { value: string; expiresAt?: number }>();

function memGet(key: string): string | null {
  const e = memory.get(key);
  if (!e) return null;
  if (e.expiresAt && Date.now() > e.expiresAt) {
    memory.delete(key);
    return null;
  }
  return e.value;
}

export const kv = {
  async get(key: string): Promise<string | null> {
    if (isUpstashConfigured()) {
      return upstash<string | null>(['GET', key]);
    }
    return memGet(key);
  },

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (isUpstashConfigured()) {
      await upstash(['SETEX', key, ttlSeconds, value]);
      return;
    }
    memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  async incr(key: string): Promise<number> {
    if (isUpstashConfigured()) {
      return upstash<number>(['INCR', key]);
    }
    const v = parseInt(memGet(key) || '0', 10) + 1;
    memory.set(key, { value: String(v) });
    return v;
  },

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (isUpstashConfigured()) {
      return upstash<number>(['EXPIRE', key, ttlSeconds]).then(r => r === 1);
    }
    const v = memGet(key);
    if (v === null) return false;
    memory.set(key, { value: v, expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  },
};
