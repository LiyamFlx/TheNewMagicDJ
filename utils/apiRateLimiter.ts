import type { VercelRequest } from '@vercel/node';

type Result = { allowed: true } | { allowed: false; retryAfter: number };

function getClientKey(req: VercelRequest): string {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  return ip;
}

const mem = new Map<string, { count: number; reset: number }>();

export async function checkAndConsume(req: VercelRequest, bucket: string, max: number, windowMs: number): Promise<Result> {
  const client = getClientKey(req);
  const key = `rl:${bucket}:${client}`;

  // KV-backed path
  if (process.env.DURABLE_STORE_URL && process.env.DURABLE_STORE_TOKEN) {
    const { kv } = await import('./kv.js');
    const current = await kv.incr(key);
    if (current === 1) {
      // set expiry window
      await kv.expire(key, Math.ceil(windowMs / 1000));
    }
    if (current > max) {
      // we cannot read TTL via Upstash lite path; approximate by window
      return { allowed: false, retryAfter: windowMs };
    }
    return { allowed: true };
  }

  // Memory fallback
  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || now >= entry.reset) {
    mem.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfter: entry.reset - now };
  }
  entry.count += 1;
  return { allowed: true };
}

