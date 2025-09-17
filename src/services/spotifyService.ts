import { Track } from '../types';
import { mockSpotifyService } from './mockSpotifyService';
import { productionSpotifyService } from './productionSpotifyService';

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

interface SpotifyService {
  initialize(token: string): void;
  getRecommendations(params: SpotifyRecommendationParams): Promise<Track[]>;
}

class UnifiedSpotifyService implements SpotifyService {
  private token: string | null = null;
  private useMock: boolean = false;

  constructor() {
    // Determine if we should use mock service
    this.useMock = this.shouldUseMock();
  }

  private shouldUseMock(): boolean {
    // Use mock in development or when Spotify credentials are not available
    if (import.meta.env?.DEV) {
      return true;
    }

    // Check if Spotify credentials are available
    const hasCredentials =
      import.meta.env?.VITE_SPOTIFY_CLIENT_ID ||
      process.env?.SPOTIFY_CLIENT_ID ||
      process.env?.VITA_SPOTIFY_CLIENT_ID;

    return !hasCredentials;
  }

  initialize(token: string): void {
    this.token = token;

    // If we have a real token and are not forced to use mock, switch to production
    if (token && token !== 'mock-spotify-token-dev' && !this.useMock) {
      // Production service doesn't need explicit initialization with token
      // It handles token management internally through the API
    }
  }

  async getRecommendations(
    params: SpotifyRecommendationParams
  ): Promise<Track[]> {
    if (this.useMock || this.token === 'mock-spotify-token-dev') {
      return mockSpotifyService.getRecommendations(params);
    }

    // Use production service, which handles its own token management
    return productionSpotifyService.getRecommendations(params);
  }

  // Utility method to check if we're using mock service
  isUsingMock(): boolean {
    return this.useMock || this.token === 'mock-spotify-token-dev';
  }

  // Method to force mock mode (useful for testing/development)
  setMockMode(useMock: boolean): void {
    this.useMock = useMock;
  }
}

// Export singleton instance
export const spotifyService = new UnifiedSpotifyService();

// Export types for use by components
export type { SpotifyRecommendationParams, SpotifyService };
