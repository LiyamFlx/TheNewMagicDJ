import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIdempotency } from '../utils/idempotency.js';
import apiConfig from './config.js';
import {
  AppError,
  errorFromResponse,
  normalizeError,
} from '../src/utils/errors.js';

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
const BUCKET_MAX = 20;
const BUCKET_WINDOW_MS = 60_000;

function getClientKey(req: VercelRequest): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  return `youtube:${ip}`;
}

function checkBucket(req: VercelRequest) {
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

async function youtubeSearchHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res
      .status(405)
      .json({ error: { code: 'BAD_REQUEST', message: 'Method not allowed' } });
  }

  const apiKey = apiConfig.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({
      error: {
        code: 'MISSING_CREDENTIALS',
        message: 'YouTube service temporarily unavailable',
        httpStatus: 503,
        retryable: true,
      },
    });
  }

  try {
    const bucket = checkBucket(req);
    if (!bucket.allowed) {
      res.setHeader(
        'Retry-After',
        Math.ceil((bucket.retryAfter || 1000) / 1000).toString()
      );
      res.setHeader('Content-Type', 'application/json');
      return res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
    }

    const query = req.query.q as string;
    const maxResults = Math.min(parseInt(req.query.maxResults as string) || 10, 50);

    if (!query || query.trim().length === 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        error: { code: 'MISSING_QUERY', message: 'Search query is required' },
      });
    }

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query.trim());
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoCategoryId', '10'); // Music category
    searchUrl.searchParams.set('videoDefinition', 'any');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('maxResults', maxResults.toString());
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('key', apiKey);

    const response = await fetchWithTimeout(searchUrl.toString(), {}, 15000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API Error:', response.status, errorText);

      if (response.status === 403) {
        throw new AppError(
          'QUOTA_EXCEEDED',
          'YouTube API quota exceeded',
          { httpStatus: 503 }
        );
      }

      if (response.status === 401) {
        throw new AppError(
          'INVALID_CREDENTIALS',
          'YouTube API key is invalid',
          { httpStatus: 502 }
        );
      }

      throw new AppError(
        'YOUTUBE_API_ERROR',
        'YouTube search failed',
        { httpStatus: response.status }
      );
    }

    const data = await response.json();

    // Filter and clean the results
    const cleanedItems = (data.items || []).map((item: any) => ({
      id: {
        videoId: item.id.videoId
      },
      snippet: {
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails
      }
    }));

    const result = {
      items: cleanedItems,
      pageInfo: {
        totalResults: data.pageInfo?.totalResults || cleanedItems.length,
        resultsPerPage: data.pageInfo?.resultsPerPage || cleanedItems.length
      }
    };

    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);

  } catch (e: any) {
    const normalized = normalizeError(e, {
      code: 'YOUTUBE_API_ERROR',
      message: 'YouTube search temporarily unavailable',
    });

    console.error('YouTube search error:', normalized);

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

export default (apiConfig.ENABLE_IDEMPOTENCY
  ? withIdempotency(youtubeSearchHandler)
  : youtubeSearchHandler);