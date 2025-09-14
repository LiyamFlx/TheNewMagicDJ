import { Playlist, Track, RecognitionResult } from '../types';
import { productionSpotifyService } from './productionSpotifyService';
import { mockSpotifyService } from './mockSpotifyService';
import { logger } from '../utils/logger';

const USE_MOCK_SERVICES = import.meta.env.VITE_USE_MOCK_SERVICES === 'true';

class PlaylistService {
  private spotifyService = USE_MOCK_SERVICES ? mockSpotifyService : productionSpotifyService;

  async generateMagicMatchPlaylist(fingerprint?: string, seedTrack?: Track): Promise<Playlist> {
    return logger.trackOperation(
      'PlaylistService',
      'generateMagicMatchPlaylist',
      async () => {
        let recognizedTrack: Track | null = null;

        if (fingerprint) {
          // Try to recognize the track from fingerprint
          try {
            const recognition = await this.recognizeTrack(fingerprint);
            if (recognition) {
              recognizedTrack = {
                id: recognition.spotify_id || `recognized-${Date.now()}`,
                title: recognition.title,
                artist: recognition.artist,
                album: recognition.album,
                duration: recognition.duration || 180,
                preview_url: recognition.preview_url,
                spotify_id: recognition.spotify_id
              };
            }
          } catch (error) {
            logger.warn('PlaylistService', 'Track recognition failed, using seed track', error);
          }
        }

        const baseTrack = recognizedTrack || seedTrack;
        let tracks: Track[] = [];

        if (baseTrack) {
          // Get recommendations based on the recognized/seed track
          try {
            tracks = await this.spotifyService.getRecommendations({
              seed_tracks: [baseTrack.spotify_id || baseTrack.id],
              limit: 15,
              target_energy: 0.7,
              target_danceability: 0.8
            });
          } catch (error) {
            logger.warn('PlaylistService', 'Failed to get track-based recommendations, using genre-based', error);
          }
        }

        // Fallback to genre-based recommendations if track-based failed
        if (tracks.length === 0) {
          tracks = await this.spotifyService.getRecommendations({
            seed_genres: ['electronic', 'house', 'techno'],
            limit: 15,
            target_energy: 0.7,
            target_danceability: 0.8,
            min_tempo: 120,
            max_tempo: 140
          });
        }

        // Add the recognized track at the beginning if we have one
        if (recognizedTrack && !tracks.find(t => t.id === recognizedTrack!.id)) {
          tracks.unshift(recognizedTrack);
        }

        const playlist: Playlist = {
          id: `magic-match-${Date.now()}`,
          name: recognizedTrack 
            ? `Magic Match: ${recognizedTrack.title}` 
            : 'Magic Match Playlist',
          description: recognizedTrack
            ? `AI-curated playlist based on "${recognizedTrack.title}" by ${recognizedTrack.artist}`
            : 'AI-curated playlist based on audio recognition',
          tracks,
          total_duration: tracks.reduce((sum, track) => sum + track.duration, 0),
          created_at: new Date().toISOString(),
          user_id: 'demo-user',
          type: 'magic_match',
          metadata: {
            seed_track: recognizedTrack || undefined,
            recognition_confidence: fingerprint ? 0.85 : undefined
          }
        };

        return playlist;
      },
      { fingerprint: !!fingerprint, seedTrack: !!seedTrack }
    );
  }

  async generateMagicSetPlaylist(vibe: string, energyLevel: 'low' | 'medium' | 'high'): Promise<Playlist> {
    return logger.trackOperation(
      'PlaylistService',
      'generateMagicSetPlaylist',
      async () => {
        const energyMap = {
          low: { energy: 0.3, tempo_min: 80, tempo_max: 110 },
          medium: { energy: 0.6, tempo_min: 110, tempo_max: 130 },
          high: { energy: 0.8, tempo_min: 130, tempo_max: 150 }
        };

        const genreMap: { [key: string]: string[] } = {
          electronic: ['electronic', 'house', 'techno', 'edm'],
          'hip-hop': ['hip-hop', 'rap', 'trap'],
          house: ['house', 'deep-house', 'tech-house'],
          techno: ['techno', 'minimal-techno', 'detroit-techno']
        };

        const energy = energyMap[energyLevel];
        const genres = genreMap[vibe.toLowerCase()] || genreMap.electronic;

        const tracks = await this.spotifyService.getRecommendations({
          seed_genres: genres,
          limit: 20,
          target_energy: energy.energy,
          target_danceability: 0.6,
          min_tempo: energy.tempo_min,
          max_tempo: energy.tempo_max
        });

        const playlist: Playlist = {
          id: `magic-set-${Date.now()}`,
          name: `Magic Set: ${vibe.charAt(0).toUpperCase() + vibe.slice(1)} (${energyLevel.toUpperCase()})`,
          description: `AI-generated ${vibe} playlist with ${energyLevel} energy`,
          tracks,
          total_duration: tracks.reduce((sum, track) => sum + track.duration, 0),
          created_at: new Date().toISOString(),
          user_id: 'demo-user',
          type: 'magic_set',
          metadata: {
            vibe,
            energy_level: energyLevel
          }
        };

        return playlist;
      },
      { vibe, energyLevel }
    );
  }

  async recognizeTrack(fingerprint: string): Promise<RecognitionResult | null> {
    return logger.trackOperation(
      'PlaylistService',
      'recognizeTrack',
      async () => {
        // This would integrate with AcoustID, AudD, or other recognition services
        // For now, return a mock result
        return {
          title: 'Recognized Track',
          artist: 'Unknown Artist',
          confidence: 0.85,
          duration: 180
        };
      },
      { fingerprint }
    );
  }

  async recognizeFromAudioFile(file: File): Promise<Track | null> {
    return logger.trackOperation(
      'PlaylistService',
      'recognizeFromAudioFile',
      async () => {
        // This would process the audio file and recognize it
        // For now, return null to trigger fingerprint fallback
        return null;
      },
      { fileName: file.name, fileSize: file.size }
    );
  }
}

export const playlistService = new PlaylistService();