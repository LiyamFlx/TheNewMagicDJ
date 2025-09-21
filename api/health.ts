import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiConfig from './config.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const spotifyConfigured = Boolean(apiConfig.SPOTIFY_CLIENT_ID && apiConfig.SPOTIFY_CLIENT_SECRET);
  const youtubeConfigured = Boolean(apiConfig.YOUTUBE_API_KEY);
  const kvConfigured = Boolean(process.env.DURABLE_STORE_URL && process.env.DURABLE_STORE_TOKEN);

  const status = spotifyConfigured && youtubeConfigured ? 'ok' : 'degraded';

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    status,
    env: {
      spotifyConfigured,
      youtubeConfigured,
      kvConfigured,
      idempotencyEnabled: apiConfig.ENABLE_IDEMPOTENCY,
      rateLimitEnabled: apiConfig.ENABLE_RATE_LIMIT,
    },
    timestamp: new Date().toISOString(),
  });
}

