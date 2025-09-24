import { Track } from '../types';
import { logger } from '../utils/logger';
import { fetchWithRetry } from '../utils/http';
import { rateLimiter } from '../utils/rateLimiter';
import { errorFromResponse } from '../utils/errors';
import config from '../config';

interface SpotifyRecommendationParams {
  seed_tracks?: string[];
  seed_genres?: string[];
  limit?: number;
  target_energy?: number;
  target_danceability?: number;
  target_valence?: number;
  min_tempo?: number;
  max_tempo?: number;
}

interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyRecommendationsResponse {
  tracks: SpotifyTrack[];
}

class ProductionSpotifyService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private authBackoffUntil: number = 0;
  private recsCache = new Map<string, { data: Track[]; expiry: number }>();
  private readonly recsTtlMs = 120_000; // 2 minutes

  private getCacheKey(params: SpotifyRecommendationParams): string {
    // Cache key excluding limit since response depends on it; include it too
    return JSON.stringify({ ...params });
  }

  private async authenticate(): Promise<string> {
    return logger.trackOperation(
      'ProductionSpotifyService',
      'authenticate',
      async () => {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
          return this.accessToken;
        }

        // If previous authentication failed recently, back off to avoid spamming the API
        if (Date.now() < this.authBackoffUntil) {
          throw new Error(
            'Spotify authentication temporarily disabled due to recent failures'
          );
        }

        try {
          // Request token from serverless proxy to avoid exposing secrets in client
          const base = config.API_BASE_URL || '';
          const tokenUrl = `${base}/api/spotify-token`;
          const response = await fetchWithRetry(
            tokenUrl,
            { method: 'GET' },
            { timeoutMs: 12000, retries: 2 }
          );

          if (!response.ok) {
            const errorText = await response.text();
            const err = await errorFromResponse(response, errorText);
            logger._error(
              'ProductionSpotifyService',
              'Authentication failed',
              err
            );
            throw err;
          }

          const ct = response.headers.get('content-type') || '';
          if (!ct.includes('application/json')) {
            const snippet = (await response.text()).slice(0, 120);
            const err = {
              code: 'BAD_RESPONSE',
              message: 'Non-JSON token response',
              details: snippet,
            } as any;
            logger._error(
              'ProductionSpotifyService',
              'Authentication failed',
              err
            );
            throw err;
          }
          const data: SpotifyAuthResponse = await response.json();
          this.accessToken = data.access_token;
          this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 minute buffer

          logger.info('ProductionSpotifyService', 'Authentication successful', {
            tokenType: data.token_type,
            expiresIn: data.expires_in,
          });

          return this.accessToken;
        } catch (_error) {
          logger._error(
            'ProductionSpotifyService',
            'Authentication request failed',
            _error
          );
          // Back off for 5 minutes after auth failure
          this.authBackoffUntil = Date.now() + 5 * 60 * 1000;
          throw _error;
        }
      }
    );
  }

  async getRecommendations(
    params: SpotifyRecommendationParams
  ): Promise<Track[]> {
    return logger.trackOperation(
      'ProductionSpotifyService',
      'getRecommendations',
      async () => {
        try {
          // In dev, avoid calling serverless API/Spotify and use local fallback
          if ((import.meta as any)?.env?.DEV) {
            logger.info(
              'ProductionSpotifyService',
              'Dev mode: using real Spotify API'
            );
          }
          const token = await this.authenticate();

          // Client-side rate limit to avoid hammering upstream
          await rateLimiter.waitForLimit('spotify');

          // Serve from cache when available
          const cacheKey = this.getCacheKey(params);
          const cached = this.recsCache.get(cacheKey);
          const now = Date.now();
          if (cached && now < cached.expiry) {
            logger.debug(
              'ProductionSpotifyService',
              'Serving recommendations from cache',
              { cacheKey }
            );
            return cached.data;
          }

          const queryParams = new URLSearchParams();

          if (params.seed_tracks?.length) {
            queryParams.append('seed_tracks', params.seed_tracks.join(','));
          }
          if (params.seed_genres?.length) {
            queryParams.append('seed_genres', params.seed_genres.join(','));
          }
          if (params.limit) {
            queryParams.append('limit', params.limit.toString());
          }
          if (params.target_energy !== undefined) {
            queryParams.append(
              'target_energy',
              params.target_energy.toString()
            );
          }
          if (params.target_danceability !== undefined) {
            queryParams.append(
              'target_danceability',
              params.target_danceability.toString()
            );
          }
          if (params.target_valence !== undefined) {
            queryParams.append(
              'target_valence',
              params.target_valence.toString()
            );
          }
          if (params.min_tempo) {
            queryParams.append('min_tempo', params.min_tempo.toString());
          }
          if (params.max_tempo) {
            queryParams.append('max_tempo', params.max_tempo.toString());
          }

          const url = `https://api.spotify.com/v1/recommendations?${queryParams.toString()}`;

          const doFetch = async (bearer: string) =>
            fetchWithRetry(
              url,
              {
                headers: {
                  Authorization: `Bearer ${bearer}`,
                  'Content-Type': 'application/json',
                },
              },
              { timeoutMs: 12000, retries: 2 }
            );

          let response = await doFetch(token);

          // If token expired or unauthorized, refresh once and retry
          if (response.status === 401 || response.status === 403) {
            this.accessToken = null;
            this.tokenExpiry = 0;
            const newToken = await this.authenticate();
            response = await doFetch(newToken);
          }

          if (!response.ok) {
            const errorText = await response.text();
            const err = await errorFromResponse(response, errorText);
            logger._error(
              'ProductionSpotifyService',
              'Recommendations API failed',
              { ...err, url, params }
            );
            throw err;
          }

          const data: SpotifyRecommendationsResponse = await response.json();

          const tracks: Track[] = data.tracks.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            duration: Math.round((track.duration_ms ?? 0) / 1000),
            preview_url: track.preview_url ?? undefined,
            spotify_id: track.id,
            external_urls: track.external_urls,
            images: track.album.images,
            // Add some mock audio features for DJ functionality
            bpm: Math.floor(Math.random() * 60) + 100, // 100-160 BPM
            key: [
              'C',
              'C#',
              'D',
              'D#',
              'E',
              'F',
              'F#',
              'G',
              'G#',
              'A',
              'A#',
              'B',
            ][Math.floor(Math.random() * 12)],
            energy: params.target_energy || Math.random(),
            danceability: params.target_danceability || Math.random(),
            valence: params.target_valence || Math.random(),
          }));

          logger.info(
            'ProductionSpotifyService',
            'Recommendations retrieved successfully',
            {
              trackCount: tracks.length,
              hasPreviewUrls: tracks.filter(t => t.preview_url).length,
            }
          );

          // Cache result
          this.recsCache.set(cacheKey, {
            data: tracks,
            expiry: now + this.recsTtlMs,
          });
          return tracks;
        } catch (_error) {
          logger._error(
            'ProductionSpotifyService',
            'Recommendations failed - no fallback available',
            _error
          );

          // No demo fallback - return empty array when Spotify API fails
          return [];
        }
      },
      params
    );
  }
}

export const productionSpotifyService = new ProductionSpotifyService();
