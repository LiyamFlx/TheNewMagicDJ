import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIdempotency } from '../utils/idempotency.js';
import apiConfig from './config.js';

// Simple in-memory cache for audio URLs to reduce upstream requests
const audioCache = new Map<string, {
  headers: Record<string, string>;
  expiry: number;
  size: number;
}>();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB limit
const SUPPORTED_FORMATS = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/ogg'
];

// Trusted royalty-free audio hosts to prevent abuse
const ALLOWED_HOSTS = [
  'www.soundhelix.com',
  'freemusicarchive.org',
  'archive.org',
  'openmusicarchive.org',
  'musopen.org',
  'freepd.com'
];

interface AudioMetadata {
  contentType: string;
  contentLength: number;
  contentRange?: string;
  acceptRanges?: string;
}

function isValidAudioUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_HOSTS.some(host => parsedUrl.hostname === host);
  } catch {
    return false;
  }
}

function getCacheKey(url: string, range?: string): string {
  return `${url}${range ? `#${range}` : ''}`;
}

async function fetchAudioMetadata(url: string): Promise<AudioMetadata> {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      'User-Agent': 'TheNewMagicDJ-AudioProxy/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Audio source returned ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const contentLength = parseInt(response.headers.get('content-length') || '0');

  // Validate content type
  if (!SUPPORTED_FORMATS.some(format => contentType.includes(format.split('/')[1]))) {
    throw new Error(`Unsupported audio format: ${contentType}`);
  }

  // Validate file size
  if (contentLength > MAX_AUDIO_SIZE) {
    throw new Error(`Audio file too large: ${Math.round(contentLength / 1024 / 1024)}MB (max ${MAX_AUDIO_SIZE / 1024 / 1024}MB)`);
  }

  return {
    contentType,
    contentLength,
    acceptRanges: response.headers.get('accept-ranges') || undefined
  };
}

async function streamAudioContent(
  url: string,
  res: VercelResponse,
  range?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'User-Agent': 'TheNewMagicDJ-AudioProxy/1.0'
  };

  if (range) {
    headers['Range'] = range;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Audio streaming failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const contentLength = response.headers.get('content-length');
  const contentRange = response.headers.get('content-range');
  const acceptRanges = response.headers.get('accept-ranges');

  // Set response headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour browser cache

  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }
  if (contentRange) {
    res.setHeader('Content-Range', contentRange);
    res.status(206); // Partial content
  }
  if (acceptRanges) {
    res.setHeader('Accept-Ranges', acceptRanges);
  }

  // Stream the audio content
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
  }

  res.end();
}

async function audioProxyHandler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET and HEAD methods are supported'
      }
    });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      error: {
        code: 'MISSING_URL',
        message: 'Audio URL parameter is required'
      }
    });
  }

  if (!isValidAudioUrl(url)) {
    return res.status(403).json({
      error: {
        code: 'INVALID_HOST',
        message: 'Audio source not allowed. Only trusted royalty-free hosts are supported.'
      }
    });
  }

  try {
    const range = req.headers.range;
    const cacheKey = getCacheKey(url, range);

    // Check cache for metadata
    const cached = audioCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      // Return cached headers for HEAD requests
      if (req.method === 'HEAD') {
        Object.entries(cached.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        return res.status(200).end();
      }
    }

    // For HEAD requests, get metadata only
    if (req.method === 'HEAD') {
      const metadata = await fetchAudioMetadata(url);

      // Cache the metadata
      audioCache.set(cacheKey, {
        headers: {
          'Content-Type': metadata.contentType,
          'Content-Length': metadata.contentLength.toString(),
          'Accept-Ranges': metadata.acceptRanges || 'bytes'
        },
        expiry: Date.now() + CACHE_TTL_MS,
        size: metadata.contentLength
      });

      res.setHeader('Content-Type', metadata.contentType);
      res.setHeader('Content-Length', metadata.contentLength.toString());
      res.setHeader('Accept-Ranges', metadata.acceptRanges || 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      return res.status(200).end();
    }

    // Stream audio content for GET requests
    await streamAudioContent(url, res, range);

  } catch (error) {
    console.error('Audio proxy error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('too large') ? 413 :
                       errorMessage.includes('Unsupported') ? 415 :
                       errorMessage.includes('not found') ? 404 : 502;

    return res.status(statusCode).json({
      error: {
        code: 'PROXY_ERROR',
        message: `Audio proxy failed: ${errorMessage}`
      }
    });
  }
}

export default apiConfig.ENABLE_IDEMPOTENCY
  ? withIdempotency(audioProxyHandler)
  : audioProxyHandler;