import type { VercelRequest, VercelResponse } from '@vercel/node';
// Import from app-level utils to ensure Vercel bundling resolves path
import { withIdempotency } from '../utils/idempotency.js';
import { requireAuth } from '../src/utils/apiAuth';
import apiConfig from './config';
import { errorFromResponse, normalizeError } from '../src/utils/errors';

const AUDD_URL = 'https://api.audd.io/';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Simple token bucket per user/IP
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
const BUCKET_MAX = 15; // per minute
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
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function auddHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res
      .status(405)
      .json({ error: { code: 'BAD_REQUEST', message: 'Method not allowed' } });
    return;
  }

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

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const bodyBuffer = Buffer.concat(chunks);

    const token = process.env.AUDD_API_TOKEN;
    if (!token) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server missing AUDD_API_TOKEN',
        },
      });
      return;
    }

    // Forward to AudD, injecting api_token
    const boundaryMatch = req.headers['content-type']
      ?.toString()
      .match(/boundary=(.*)$/);
    let fetchInit: RequestInit;
    if (boundaryMatch) {
      // multipart/form-data: append token as an extra field by reconstructing is non-trivial.
      // Simpler approach: rely on client not sending token and add it via query param.
      const url = new URL(AUDD_URL);
      url.searchParams.set('api_token', token);
      fetchInit = {
        method: 'POST',
        headers: { 'Content-Type': req.headers['content-type'] as string },
        body: bodyBuffer,
      };
      const response = await fetchWithTimeout(url.toString(), fetchInit, 20000);
      const text = await response.text();
      if (!response.ok) {
        const err = await errorFromResponse(response, text);
        return res.status(err.httpStatus || 502).json({ error: err });
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(text);
    } else {
      // Assume JSON with { audio: base64 } or similar
      const payload = JSON.parse(bodyBuffer.toString('utf8'));
      payload.api_token = token;
      const response = await fetchWithTimeout(
        AUDD_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        20000
      );
      const text = await response.text();
      if (!response.ok) {
        const err = await errorFromResponse(response, text);
        return res.status(err.httpStatus || 502).json({ error: err });
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(text);
    }
  } catch (e: any) {
    const normalized = normalizeError(e, {
      code: 'INTERNAL_ERROR',
      message: 'AudD proxy failed',
    });
    res.status(normalized.httpStatus || 500).json({ error: normalized });
  }
}

export default apiConfig.ENABLE_IDEMPOTENCY
  ? withIdempotency(auddHandler)
  : auddHandler;
