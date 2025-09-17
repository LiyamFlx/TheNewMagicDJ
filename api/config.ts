// Centralized serverless (API) configuration and feature flags

export const apiConfig = {
  SPOTIFY_CLIENT_ID:
    process.env.SPOTIFY_CLIENT_ID || process.env.VITA_SPOTIFY_CLIENT_ID || '',
  SPOTIFY_CLIENT_SECRET:
    process.env.SPOTIFY_CLIENT_SECRET ||
    process.env.VITA_SPOTIFY_CLIENT_SECRET ||
    '',
  ENABLE_IDEMPOTENCY: process.env.ENABLE_IDEMPOTENCY !== 'false',
  ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT !== 'false',
  DURABLE_STORE_URL: process.env.DURABLE_STORE_URL || '', // optional KV/Redis URL
};

export default apiConfig;

