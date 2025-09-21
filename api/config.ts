// Centralized serverless (API) configuration and feature flags

// Accept both Vercel (plain) and Vite-style variables, with typo-tolerant fallback
function readEnv(name: string, fallbacks: string[] = []): string {
  const keys = [name, ...fallbacks];
  for (const key of keys) {
    const val = (process as any)?.env?.[key];
    if (val) return val;
  }
  return '';
}

export const apiConfig = {
  // Prefer server-side secrets; accept Vite-style for convenience; ignore old typo VITA_*
  SPOTIFY_CLIENT_ID: readEnv('SPOTIFY_CLIENT_ID', ['VITE_SPOTIFY_CLIENT_ID', 'VITA_SPOTIFY_CLIENT_ID']),
  SPOTIFY_CLIENT_SECRET: readEnv('SPOTIFY_CLIENT_SECRET', ['VITE_SPOTIFY_CLIENT_SECRET', 'VITA_SPOTIFY_CLIENT_SECRET']),
  YOUTUBE_API_KEY: readEnv('YOUTUBE_API_KEY', ['VITE_YOUTUBE_API_KEY']),
  ENABLE_IDEMPOTENCY: readEnv('ENABLE_IDEMPOTENCY') !== 'false',
  ENABLE_RATE_LIMIT: readEnv('ENABLE_RATE_LIMIT') !== 'false',
  DURABLE_STORE_URL: readEnv('DURABLE_STORE_URL'), // optional KV/Redis URL
};

export default apiConfig;
