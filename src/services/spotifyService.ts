import { Track } from '../types';
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

  initialize(_token: string): void {
    // Production service handles its own token management
    // No initialization needed
  }

  async getRecommendations(
    params: SpotifyRecommendationParams
  ): Promise<Track[]> {
    // Always use production service - no more mocking
    return productionSpotifyService.getRecommendations(params);
  }
}

// Export singleton instance
export const spotifyService = new UnifiedSpotifyService();

// Export types for use by components
export type { SpotifyRecommendationParams, SpotifyService };
