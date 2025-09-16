import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIdempotency } from '../src/utils/idempotency';
import { requireAuth } from '../src/utils/apiAuth';
import { AppError, errorFromResponse, normalizeError } from '../src/utils/errors';

// In-memory token cache and simple rate limiting for this endpoint
type TokenCache = { access_token: string; token_type: string; expires_at: number; expires_in: number } | null;
let tokenCache: TokenCache = null;
let inflight: Promise<any> | null = null;

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
const BUCKET_MAX = 30; // per minute per user/IP
const BUCKET_WINDOW_MS = 60_000;

function getClientKey(req: VercelRequest): string {
  // Prefer authenticated user id when available (set by requireAuth)
  const userId = (req as any).user?.id || 'anon';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  return `${userId}:${ip}`;
}

function checkBucket(req: VercelRequest): { allowed: boolean; retryAfter?: number } {
  const key = getClientKey(req);
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.reset) {
    buckets.set(key, { count: 1, reset: now + BUCKET_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= BUCKET_MAX) {
    return { allowed: false, retryAfter: entry.reset - now };
  }
  entry.count += 1;
  return { allowed: true };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function spotifyTokenHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'BAD_REQUEST', message: 'Method not allowed' } });
    return;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Server missing Spotify credentials' } });
    return;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    // Rate limit this endpoint per user/IP
    const bucket = checkBucket(req);
    if (!bucket.allowed) {
      res.setHeader('Retry-After', Math.ceil((bucket.retryAfter || 1000) / 1000).toString());
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    }

    // Serve from cache if valid with 60s buffer
    const now = Date.now();
    if (tokenCache && now < tokenCache.expires_at - 60_000) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        access_token: tokenCache.access_token,
        token_type: tokenCache.token_type,
        expires_in: Math.max(0, Math.floor((tokenCache.expires_at - now) / 1000)),
      });
    }

    if (!inflight) {
      inflight = (async () => {
        // Simple retry with respect to Retry-After
        let attempt = 0;
        const maxAttempts = 3;
        let lastError: any;
        while (attempt < maxAttempts) {
          const resp = await fetchWithTimeout('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          }, 12000);

          if (resp.ok) {
            const json = await resp.json();
            const expires_at = Date.now() + (json.expires_in * 1000);
            tokenCache = {
              access_token: json.access_token,
              token_type: json.token_type,
              expires_in: json.expires_in,
              expires_at,
            };
            return tokenCache;
          }

          // Handle 429 with Retry-After
          if (resp.status === 429) {
            const retryAfter = resp.headers.get('retry-after');
            const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1500 * (attempt + 1);
            await new Promise(r => setTimeout(r, isNaN(waitMs) ? 1500 : waitMs));
            attempt++;
            continue;
          }

          const body = await resp.text();
          lastError = await errorFromResponse(resp, body);
          // Retry only on 5xx
          if (resp.status >= 500) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
            attempt++;
            continue;
          }
          throw lastError;
        }
        throw lastError || new AppError('UPSTREAM_ERROR', 'Spotify token fetch failed');
      })().finally(() => { inflight = null; });
    }

    const token = await inflight;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      access_token: token.access_token,
      token_type: token.token_type,
      expires_in: Math.max(0, Math.floor((token.expires_at - Date.now()) / 1000)),
    });
  } catch (e: any) {
    const normalized = normalizeError(e, { code: 'INTERNAL_ERROR', message: 'Token request failed' });
    res.status(normalized.httpStatus || 500).json({ error: normalized });
  }
}

export default withIdempotency(requireAuth(spotifyTokenHandler));
