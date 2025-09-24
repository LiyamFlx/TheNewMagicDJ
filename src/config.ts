// Centralized frontend configuration and feature flags
// Derive only from import.meta.env here; other code should import from this module.

type FrontendConfig = {
  IS_DEV: boolean;
  API_BASE_URL: string;
  USE_SPOTIFY_MOCK: boolean;
  YOUTUBE_API_KEY: string;
  YOUTUBE_CLIENT_ID: string;
};

const IS_DEV = Boolean(import.meta.env?.DEV);

// Allow overriding API base if needed; default to same origin
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || '';

// Explicit flag to force mock; otherwise mock in dev or when no client id exists in env
const USE_SPOTIFY_MOCK = Boolean(
  import.meta.env?.VITE_USE_SPOTIFY_MOCK === 'true' ||
    (IS_DEV && !import.meta.env?.VITE_SPOTIFY_CLIENT_ID)
);

// YouTube API configuration (no hard-coded defaults)
const YOUTUBE_API_KEY = (import.meta.env?.VITE_YOUTUBE_API_KEY as string) || '';
const YOUTUBE_CLIENT_ID =
  (import.meta.env?.VITE_YOUTUBE_CLIENT_ID as string) || '';

export const config: FrontendConfig = {
  IS_DEV,
  API_BASE_URL,
  USE_SPOTIFY_MOCK,
  YOUTUBE_API_KEY,
  YOUTUBE_CLIENT_ID,
};

export default config;
