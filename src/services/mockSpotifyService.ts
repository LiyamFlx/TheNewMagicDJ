import { Track } from '../types';
import { logger } from '../utils/logger';

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

class MockSpotifyService {
  private mockTracks: Track[] = [
    {
      id: 'mock-1',
      title: 'Midnight Drive',
      artist: 'Synthwave Artist',
      album: 'Neon Dreams',
      duration: 245,
      bpm: 128,
      key: 'Am',
      energy: 0.8,
      danceability: 0.7,
      valence: 0.6,
      preview_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    },
    {
      id: 'mock-2',
      title: 'Electric Pulse',
      artist: 'Techno Master',
      album: 'Digital Waves',
      duration: 320,
      bpm: 132,
      key: 'Dm',
      energy: 0.9,
      danceability: 0.8,
      valence: 0.7,
      preview_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    },
    {
      id: 'mock-3',
      title: 'Deep House Vibes',
      artist: 'House Producer',
      album: 'Underground Sessions',
      duration: 380,
      bpm: 124,
      key: 'Gm',
      energy: 0.6,
      danceability: 0.9,
      valence: 0.8,
      preview_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    },
    {
      id: 'mock-4',
      title: 'Progressive Journey',
      artist: 'Trance DJ',
      album: 'Euphoric States',
      duration: 420,
      bpm: 136,
      key: 'F#m',
      energy: 0.85,
      danceability: 0.75,
      valence: 0.9,
      preview_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    },
    {
      id: 'mock-5',
      title: 'Ambient Flow',
      artist: 'Chill Producer',
      album: 'Relaxed Beats',
      duration: 280,
      bpm: 95,
      key: 'C',
      energy: 0.3,
      danceability: 0.4,
      valence: 0.5,
      preview_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    }
  ];

  async getRecommendations(params: SpotifyRecommendationParams): Promise<Track[]> {
    return logger.trackOperation(
      'MockSpotifyService',
      'getRecommendations',
      async () => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const limit = params.limit || 15;
        const tracks: Track[] = [];

        // Generate tracks based on parameters
        for (let i = 0; i < limit; i++) {
          const baseTrack = this.mockTracks[i % this.mockTracks.length];
          const track: Track = {
            ...baseTrack,
            id: `mock-${Date.now()}-${i}`,
            title: `${baseTrack.title} (${i + 1})`,
            bpm: this.adjustBpmForParams(baseTrack.bpm, params),
            energy: params.target_energy || baseTrack.energy,
            danceability: params.target_danceability || baseTrack.danceability,
            valence: params.target_valence || baseTrack.valence
          };
          tracks.push(track);
        }

        logger.info('MockSpotifyService', 'Mock recommendations generated', {
          trackCount: tracks.length,
          params
        });

        return tracks;
      },
      params
    );
  }

  private adjustBpmForParams(baseBpm: number, params: SpotifyRecommendationParams): number {
    if (params.min_tempo && params.max_tempo) {
      return Math.floor(Math.random() * (params.max_tempo - params.min_tempo)) + params.min_tempo;
    }
    return baseBpm + Math.floor(Math.random() * 20) - 10; // ±10 BPM variation
  }
}

export const mockSpotifyService = new MockSpotifyService();