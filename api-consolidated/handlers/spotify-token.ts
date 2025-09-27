import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIdempotency } from '../../utils/idempotency.js';
import apiConfig from './config.js';
import {
  AppError,
  errorFromResponse,
  normalizeError,
} from '../../src/utils/errors.js';
import { checkAndConsume } from '../../utils/apiRateLimiter.js';

type TokenCache = {
  access_token: string;
  token_type: string;
  expires_at: number;
  expires_in: number;
} | null;

let tokenCache: TokenCache = null;
let inflight: Promise<any> | null = null;

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
const BUCKET_MAX = 30;
const BUCKET_WINDOW_MS = 60_000;

function getClientKey(req: VercelRequest): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  return `token:${ip}`;
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

async function spotifyTokenHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res
      .status(405)
      .json({ error: { code: 'BAD_REQUEST', message: 'Method not allowed' } });
  }

  const clientId = apiConfig.SPOTIFY_CLIENT_ID;
  const clientSecret = apiConfig.SPOTIFY_CLIENT_SECRET;

  // Production validation
  if (!clientId || !clientSecret) {
    console.error('[spotify-token] Missing credentials:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    });
    return res.status(500).json({
      error: {
        code: 'SPOTIFY_CONFIGURATION_ERROR',
        message: 'Spotify API credentials not configured'
      }
    });
  }


  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  );

  try {
    const decision = await checkAndConsume(req, 'spotify-token', 30, 60_000);
    if (!decision.allowed) {
      res.setHeader(
        'Retry-After',
        Math.ceil(decision.retryAfter / 1000).toString()
      );
      res.setHeader('Content-Type', 'application/json');
      return res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
    }

    const now = Date.now();
    if (tokenCache && now < tokenCache.expires_at - 60_000) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        access_token: tokenCache.access_token,
        token_type: tokenCache.token_type,
        expires_in: Math.max(
          0,
          Math.floor((tokenCache.expires_at - now) / 1000)
        ),
      });
    }

    if (!inflight) {
      inflight = (async () => {
        const resp = await fetchWithTimeout(
          'https://accounts.spotify.com/api/token',
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          },
          12000
        );

        if (resp.ok) {
          const json = await resp.json();
          const expires_at = Date.now() + json.expires_in * 1000;
          tokenCache = { ...json, expires_at };
          return tokenCache;
        }

        const body = await resp.text();
        const err = await errorFromResponse(resp, body);

        if (resp.status === 401 || resp.status === 400) {
          throw new AppError(
            'INVALID_CREDENTIALS',
            'Spotify rejected credentials',
            { httpStatus: 502 }
          );
        }

        throw err;
      })().finally(() => {
        inflight = null;
      });
    }

    const token = await inflight;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      access_token: token.access_token,
      token_type: token.token_type,
      expires_in: Math.max(
        0,
        Math.floor((token.expires_at - Date.now()) / 1000)
      ),
    });
  } catch (e: any) {
    const normalized = normalizeError(e, {
      code: 'SPOTIFY_API_ERROR',
      message: 'Spotify service temporarily unavailable',
    });
    // Return 503 for service unavailable to trigger proper fallback
    res.setHeader('Content-Type', 'application/json');
    res.status(503).json({
      error: {
        ...normalized,
        httpStatus: 503,
        retryable: true,
      },
    });
  }
}

export default apiConfig.ENABLE_IDEMPOTENCY
  ? withIdempotency(spotifyTokenHandler)
  : spotifyTokenHandler;
