import { Track } from '../types';
import { logger } from '../utils/logger';
import { fetchWithRetry } from '../utils/http';

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
  private clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  private clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  constructor() {
    this.validateCredentials();
  }

  private validateCredentials(): void {
    if (!this.clientId || !this.clientSecret) {
      logger.error('ProductionSpotifyService', 'Missing Spotify credentials', {
        hasClientId: !!this.clientId,
        hasClientSecret: !!this.clientSecret,
        clientIdLength: this.clientId?.length || 0,
        clientSecretLength: this.clientSecret?.length || 0
      });
      throw new Error('Spotify credentials not configured');
    }
    
    logger.info('ProductionSpotifyService', 'Credentials validated', {
      clientIdLength: this.clientId.length,
      clientSecretLength: this.clientSecret.length
    });
  }

  private async authenticate(): Promise<string> {
    return logger.trackOperation(
      'ProductionSpotifyService',
      'authenticate',
      async () => {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
          return this.accessToken;
        }

        const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
        
        try {
          const response = await fetchWithRetry('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          }, { timeoutMs: 12000, retries: 2 });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('ProductionSpotifyService', 'Authentication failed', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`Spotify authentication failed: ${response.status} ${response.statusText}`);
          }

          const data: SpotifyAuthResponse = await response.json();
          this.accessToken = data.access_token;
          this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

          logger.info('ProductionSpotifyService', 'Authentication successful', {
            tokenType: data.token_type,
            expiresIn: data.expires_in
          });

          return this.accessToken;
        } catch (error) {
          logger.error('ProductionSpotifyService', 'Authentication request failed', error);
          throw error;
        }
      }
    );
  }

  async getRecommendations(params: SpotifyRecommendationParams): Promise<Track[]> {
    return logger.trackOperation(
      'ProductionSpotifyService',
      'getRecommendations',
      async () => {
        try {
          const token = await this.authenticate();
          
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
            queryParams.append('target_energy', params.target_energy.toString());
          }
          if (params.target_danceability !== undefined) {
            queryParams.append('target_danceability', params.target_danceability.toString());
          }
          if (params.target_valence !== undefined) {
            queryParams.append('target_valence', params.target_valence.toString());
          }
          if (params.min_tempo) {
            queryParams.append('min_tempo', params.min_tempo.toString());
          }
          if (params.max_tempo) {
            queryParams.append('max_tempo', params.max_tempo.toString());
          }

          const url = `https://api.spotify.com/v1/recommendations?${queryParams.toString()}`;
          
          const response = await fetchWithRetry(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }, { timeoutMs: 12000, retries: 2 });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('ProductionSpotifyService', 'Recommendations API failed', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              url,
              params
            });
            throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
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
            key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)],
            energy: params.target_energy || Math.random(),
            danceability: params.target_danceability || Math.random(),
            valence: params.target_valence || Math.random()
          }));

          logger.info('ProductionSpotifyService', 'Recommendations retrieved successfully', {
            trackCount: tracks.length,
            hasPreviewUrls: tracks.filter(t => t.preview_url).length
          });

          return tracks;
        } catch (error) {
          logger.error('ProductionSpotifyService', 'Recommendations failed, using fallback', error);
          
          // Return fallback tracks with demo audio
          return this.getFallbackTracks(params.limit || 15);
        }
      },
      params
    );
  }

  private getFallbackTracks(count: number): Track[] {
    const fallbackTracks: Track[] = [];
    
    for (let i = 0; i < count; i++) {
      fallbackTracks.push({
        id: `fallback-${i}`,
        title: `Demo Track ${i + 1}`,
        artist: 'Demo Artist',
        album: 'Demo Album',
        duration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
        bpm: Math.floor(Math.random() * 60) + 100,
        key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
        energy: Math.random(),
        danceability: Math.random(),
        valence: Math.random(),
        preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Demo audio
      });
    }
    
    return fallbackTracks;
  }
}

export const productionSpotifyService = new ProductionSpotifyService();
