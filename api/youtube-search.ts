import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIdempotency } from '../utils/idempotency.js';
import apiConfig from './config.js';
import { AppError, normalizeError } from '../src/utils/errors.js';
import { validateYouTubeSearch } from '../shared/validators.js';
import { checkAndConsume } from '../utils/apiRateLimiter.js';

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
    const decision = await checkAndConsume(req, 'youtube-search', 100, 60_000);
    if (!decision.allowed) {
      res.setHeader('Retry-After', Math.ceil(decision.retryAfter / 1000).toString());
      res.setHeader('Content-Type', 'application/json');
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    }

    const { q: query, maxResults } = validateYouTubeSearch(req.query);

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

    // Filter and clean the results with guards for shape changes
    const cleanedItems = (Array.isArray(data.items) ? data.items : [])
      .filter((item: any) => item && item.id && (item.id.videoId || item.id.kind === 'youtube#video'))
      .map((item: any) => ({
        id: {
          videoId: item.id.videoId || item.id.videoId || null,
        },
        snippet: {
          title: item.snippet?.title ?? '',
          channelTitle: item.snippet?.channelTitle ?? '',
          description: item.snippet?.description ?? '',
          publishedAt: item.snippet?.publishedAt ?? '',
          thumbnails: item.snippet?.thumbnails ?? {},
        },
      }))
      .filter((i: any) => i.id.videoId);

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
