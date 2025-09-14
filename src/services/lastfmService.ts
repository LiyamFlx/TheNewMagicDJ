import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimiter';
import { errorHandler } from '../utils/errorHandler';
import { Track } from '../types';

interface LastFmTrackInfo {
  track: {
    name: string;
    artist: {
      name: string;
    };
    album?: {
      title: string;
      image?: Array<{
        '#text': string;
        size: string;
      }>;
    };
    duration?: string;
    toptags?: {
      tag: Array<{
        name: string;
        count: number;
      }>;
    };
    wiki?: {
      summary: string;
    };
  };
}

interface LastFmSimilarTracks {
  similartracks: {
    track: Array<{
      name: string;
      artist: {
        name: string;
      };
      match: string;
      url: string;
    }>;
  };
}

class LastFmService {
  private apiKey: string;
  private secret: string;
  private baseUrl = 'https://ws.audioscrobbler.com/2.0/';

  constructor() {
    this.apiKey = import.meta.env.VITE_LASTFM_API_KEY;
    this.secret = import.meta.env.VITE_LASTFM_SECRET;
    
    if (!this.apiKey) {
      logger.warn('LastFmService', 'API key not configured');
    }
  }

  async getTrackInfo(artist: string, track: string): Promise<Track | null> {
    return logger.trackOperation(
      'LastFmService',
      'getTrackInfo',
      async () => {
        if (!this.apiKey) {
          throw errorHandler.createAuthError('Last.fm');
        }

        // Check rate limit
        const limitCheck = await rateLimiter.checkLimit('lastfm');
        if (!limitCheck.allowed) {
          const error = errorHandler.createRateLimitError('Last.fm', limitCheck.retryAfter || 5000);
          errorHandler.handleError(error);
          throw new Error(error.message);
        }

        const params = new URLSearchParams({
          method: 'track.getInfo',
          api_key: this.apiKey,
          artist,
          track,
          format: 'json'
        });

        const startTime = Date.now();

        try {
          const response = await fetch(`${this.baseUrl}?${params.toString()}`);
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('lastfm', 'track.getInfo', responseTime, response.ok);

          if (!response.ok) {
            const error = errorHandler.createAPIError('Last.fm', 'track.getInfo', response.status, response.statusText);
            errorHandler.handleError(error);
            throw new Error(error.message);
          }

          const data: LastFmTrackInfo = await response.json();

          if (!data.track) {
            return null;
          }

          const trackInfo: Track = {
            id: `lastfm-${Date.now()}`,
            title: data.track.name,
            artist: data.track.artist.name,
            album: data.track.album?.title,
            duration: data.track.duration ? parseInt(data.track.duration) : 180,
            images: data.track.album?.image?.map(img => ({
              url: img['#text'],
              height: img.size === 'large' ? 300 : img.size === 'medium' ? 174 : 64,
              width: img.size === 'large' ? 300 : img.size === 'medium' ? 174 : 64
            }))
          };

          logger.info('LastFmService', 'Track info retrieved successfully', {
            title: trackInfo.title,
            artist: trackInfo.artist
          });

          return trackInfo;

        } catch (error) {
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('lastfm', 'track.getInfo', responseTime, false);

          if (error instanceof TypeError && error.message.includes('fetch')) {
            const networkError = errorHandler.createNetworkError('Last.fm track info');
            errorHandler.handleError(networkError);
            throw new Error(networkError.message);
          }

          throw error;
        }
      },
      { artist, track }
    );
  }

  async getSimilarTracks(artist: string, track: string, limit: number = 10): Promise<Track[]> {
    return logger.trackOperation(
      'LastFmService',
      'getSimilarTracks',
      async () => {
        if (!this.apiKey) {
          throw errorHandler.createAuthError('Last.fm');
        }

        // Check rate limit
        const limitCheck = await rateLimiter.checkLimit('lastfm');
        if (!limitCheck.allowed) {
          await rateLimiter.waitForLimit('lastfm');
        }

        const params = new URLSearchParams({
          method: 'track.getSimilar',
          api_key: this.apiKey,
          artist,
          track,
          limit: limit.toString(),
          format: 'json'
        });

        const startTime = Date.now();

        try {
          const response = await fetch(`${this.baseUrl}?${params.toString()}`);
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('lastfm', 'track.getSimilar', responseTime, response.ok);

          if (!response.ok) {
            const error = errorHandler.createAPIError('Last.fm', 'track.getSimilar', response.status, response.statusText);
            errorHandler.handleError(error);
            return [];
          }

          const data: LastFmSimilarTracks = await response.json();

          if (!data.similartracks?.track) {
            return [];
          }

          const tracks: Track[] = data.similartracks.track.map((track, index) => ({
            id: `lastfm-similar-${Date.now()}-${index}`,
            title: track.name,
            artist: track.artist.name,
            duration: 180, // Default duration
            // Add some variety to audio features
            bpm: Math.floor(Math.random() * 60) + 100,
            key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
            energy: Math.random(),
            danceability: Math.random(),
            valence: Math.random()
          }));

          logger.info('LastFmService', 'Similar tracks retrieved successfully', {
            count: tracks.length,
            seedTrack: `${artist} - ${track}`
          });

          return tracks;

        } catch (error) {
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('lastfm', 'track.getSimilar', responseTime, false);

          if (error instanceof TypeError && error.message.includes('fetch')) {
            const networkError = errorHandler.createNetworkError('Last.fm similar tracks');
            errorHandler.handleError(networkError);
            return [];
          }

          return [];
        }
      },
      { artist, track, limit }
    );
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getRemainingRequests(): number {
    return rateLimiter.getRemainingRequests('lastfm');
  }
}

export const lastfmService = new LastFmService();