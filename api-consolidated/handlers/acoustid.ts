import type { VercelRequest, VercelResponse } from '@vercel/node';
// Import from app-level utils to ensure Vercel bundling resolves path
import { withIdempotency } from "../../server-utils/idempotency.js';
import { requireAuth } from '../../src/utils/apiAuth';
import apiConfig from './config.js';
import { errorFromResponse, normalizeError } from '../../src/utils/errors';

// Simple per-user/IP token bucket
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
const BUCKET_MAX = 20; // per minute
const BUCKET_WINDOW_MS = 60_000;

function clientKey(req: VercelRequest): string {
  const uid = (req as any).user?.id || 'anon';
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  return `${uid}:${ip}`;
}

function checkBucket(req: VercelRequest): {
  allowed: boolean;
  retryAfter?: number;
} {
  const key = clientKey(req);
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.reset) {
    buckets.set(key, { count: 1, reset: now + BUCKET_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= BUCKET_MAX)
    return { allowed: false, retryAfter: entry.reset - now };
  entry.count += 1;
  return { allowed: true };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

const ACOUSTID_URL = 'https://api.acoustid.org/v2/lookup';

async function acoustidHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res
      .status(405)
      .json({ error: { code: 'BAD_REQUEST', message: 'Method not allowed' } });
    return;
  }

  const key = process.env.ACOUSTID_API_KEY;
  if (!key) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Server missing ACOUSTID_API_KEY',
      },
    });
    return;
  }

  const { fingerprint, duration } = req.query;
  if (!fingerprint || !duration) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Missing fingerprint or duration',
      },
    });
    return;
  }

  const params = new URLSearchParams({
    client: key as string,
    meta: 'recordings+releasegroups+compress',
    fingerprint: fingerprint as string,
    duration: duration as string,
    format: 'json',
  });

  try {
    const bucket = checkBucket(req);
    if (!bucket.allowed) {
      res.setHeader(
        'Retry-After',
        Math.ceil((bucket.retryAfter || 1000) / 1000).toString()
      );
      return res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
    }

    const response = await fetchWithTimeout(
      `${ACOUSTID_URL}?${params.toString()}`,
      {
        headers: { 'User-Agent': 'MagicDJ/1.0' },
      },
      12000
    );
    const text = await response.text();
    if (!response.ok) {
      const err = await errorFromResponse(response, text);
      return res.status(err.httpStatus || 502).json({ error: err });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(text);
  } catch (e: any) {
    const normalized = normalizeError(e, {
      code: 'INTERNAL_ERROR',
      message: 'AcoustID proxy failed',
    });
    res.status(normalized.httpStatus || 500).json({ error: normalized });
  }
}

export default apiConfig.ENABLE_IDEMPOTENCY
  ? withIdempotency(acoustidHandler)
  : acoustidHandler;
