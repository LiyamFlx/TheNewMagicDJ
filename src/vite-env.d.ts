/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string;
  readonly VITE_SPOTIFY_CLIENT_SECRET: string;
  readonly VITE_LASTFM_API_KEY: string;
  readonly VITE_LASTFM_SECRET: string;
  readonly VITE_AUDD_API_TOKEN: string;
  readonly VITE_ACOUSTID_API_KEY: string;
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_TELEMETRY_ENDPOINT: string;
  readonly VITE_ENABLE_OBSERVABILITY: string;
  readonly VITE_SPOTIFY_RATE_LIMIT: string;
  readonly VITE_ACOUSTID_RATE_LIMIT: string;
  readonly VITE_AUDD_RATE_LIMIT: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
