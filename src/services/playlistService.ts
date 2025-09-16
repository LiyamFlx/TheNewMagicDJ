import { Playlist, Track, RecognitionResult } from '../types';
import { productionSpotifyService } from './productionSpotifyService';
import { mockSpotifyService } from './mockSpotifyService';
import { youtubeService } from './youtubeService';
import { logger } from '../utils/logger';

class PlaylistService {
  private musicService = productionSpotifyService;

  // Ensure all tracks have valid preview URLs
  private validateTracks(tracks: Track[]): Track[] {
    const fallbackUrls = [
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
    ];

    return tracks.map((track, index) => {
      if (!track.preview_url || track.preview_url.trim() === '') {
        logger.warn('PlaylistService', 'Track missing preview_url, adding fallback', {
          trackId: track.id,
          title: track.title
        });
        return {
          ...track,
          preview_url: fallbackUrls[index % fallbackUrls.length]
        };
      }
      return track;
    });
  }

  async generateMagicMatchPlaylist(fingerprint?: string, seedTrack?: Track, userId?: string): Promise<Playlist> {
    return logger.trackOperation(
      'PlaylistService',
      'generateMagicMatchPlaylist',
      async () => {
        let recognizedTrack: Track | null = null;

        if (fingerprint) {
          // Try to recognize the track from fingerprint
          try {
            let recognition = await this.recognizeTrack(fingerprint);
            
            // If basic recognition failed, try enhanced recognition
            if (!recognition) {
              recognition = await this.enhancedRecognition(fingerprint);
            }
            
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
            const seed_tracks = baseTrack.spotify_id ? [baseTrack.spotify_id] : [];
            tracks = await this.musicService.getRecommendations({
              seed_tracks,
              seed_genres: ['electronic', 'house', 'techno'],
              limit: 15
            });
          } catch (error) {
            logger.warn('PlaylistService', 'Failed to get track-based recommendations, using genre-based', error);
          }
        }

        // Fallback to genre-based recommendations if track-based failed
        if (tracks.length === 0) {
          try {
            tracks = await this.musicService.getRecommendations({
              seed_genres: ['electronic', 'house', 'techno'],
              limit: 15
            });
          } catch (error) {
            logger.warn('PlaylistService', 'Primary recommendation service failed, trying YouTube', error);

            // Try YouTube service as secondary fallback
            try {
              if (youtubeService.isConfigured()) {
                const ytTracks = await youtubeService.getRecommendations({
                  seed_genres: ['electronic', 'house', 'techno'],
                  limit: 15
                });
                tracks = ytTracks || [];
              } else {
                throw new Error('YouTube service not configured');
              }
            } catch (youtubeError) {
              logger.warn('PlaylistService', 'YouTube service failed, using mock data', youtubeError);
              tracks = await mockSpotifyService.getRecommendations({
                seed_genres: ['electronic', 'house', 'techno'],
                limit: 15
              });
            }
          }
        }

        // Add the recognized track at the beginning if we have one
        if (recognizedTrack && !tracks.find(t => t.id === recognizedTrack!.id)) {
          tracks.unshift(recognizedTrack);
        }

        // Validate all tracks have working audio URLs
        tracks = this.validateTracks(tracks);

        const playlist: Playlist = {
          id: `magic-match-${Date.now()}`,
          name: recognizedTrack 
            ? `Magic Match: ${recognizedTrack.title}` 
            : 'Magic Match Playlist',
          description: recognizedTrack
            ? `AI-curated playlist based on "${recognizedTrack.title}" by ${recognizedTrack.artist}`
            : 'AI-curated playlist based on audio recognition',
          tracks,
          total_duration: tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0),
          created_at: new Date().toISOString(),
          user_id: userId || 'demo-user',
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

  async generateMagicSetPlaylist(vibe: string, energyLevel: 'low' | 'medium' | 'high', userId?: string): Promise<Playlist> {
    return logger.trackOperation(
      'PlaylistService',
      'generateMagicSetPlaylist',
      async () => {
        const energyMap = {
          low: 'low',
          medium: 'medium', 
          high: 'high'
        };

        const energy = energyMap[energyLevel];
        const genres = [vibe.toLowerCase()];

        let tracks: Track[] = [];
        
        try {
          tracks = await this.musicService.getRecommendations({
            seed_genres: genres,
            limit: 20,
            target_energy: energy as any
          });
        } catch (error) {
          logger.warn('PlaylistService', 'Primary service failed, trying YouTube', error);

          // Try YouTube service as fallback
          try {
            if (youtubeService.isConfigured()) {
              const ytTracks = await youtubeService.getRecommendations({
                seed_genres: genres,
                limit: 20,
                energy: energy as any
              });
              tracks = ytTracks || [];
            } else {
              throw new Error('YouTube service not configured');
            }
          } catch (youtubeError) {
            logger.warn('PlaylistService', 'YouTube service failed, using mock service', youtubeError);
            tracks = await mockSpotifyService.getRecommendations({
              seed_genres: genres,
              limit: 20
            });
          }
        }

        // Validate all tracks have working audio URLs
        tracks = this.validateTracks(tracks);

        const playlist: Playlist = {
          id: `magic-set-${Date.now()}`,
          name: `Magic Set: ${vibe.charAt(0).toUpperCase() + vibe.slice(1)} (${energyLevel.toUpperCase()})`,
          description: `AI-generated ${vibe} playlist with ${energyLevel} energy`,
          tracks,
          total_duration: tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0),
          created_at: new Date().toISOString(),
          user_id: userId || 'demo-user',
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
        // Mock recognition for demo purposes
        const mockResults = [
          { title: 'Electronic Dreams', artist: 'Synth Master', confidence: 0.85 },
          { title: 'Bass Drop', artist: 'DJ Thunder', confidence: 0.78 },
          { title: 'Neon Nights', artist: 'Cyber DJ', confidence: 0.92 },
          { title: 'Digital Pulse', artist: 'Tech Wizard', confidence: 0.81 }
        ];
        
        const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
        
        return {
          title: randomResult.title,
          artist: randomResult.artist,
          confidence: randomResult.confidence,
          duration: 180 + Math.floor(Math.random() * 120),
          preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
        };
      },
      { fingerprint }
    );
  }

  private async enhancedRecognition(fingerprint: string): Promise<RecognitionResult | null> {
    return logger.trackOperation(
      'PlaylistService',
      'enhancedRecognition',
      async () => {
        // Enhanced mock recognition with higher confidence
        return {
          title: 'Enhanced Recognition Track',
          artist: 'AI Recognition',
          confidence: 0.95,
          duration: 240,
          preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
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
        // Mock file recognition
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        
        return {
          id: `file-recognized-${Date.now()}`,
          title: fileName || 'Recognized Track',
          artist: 'File Recognition',
          duration: 200,
          bpm: 128,
          energy: 0.8,
          preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
        };
      },
      { fileName: file.name, fileSize: file.size }
    );
  }
}

export const playlistService = new PlaylistService();
