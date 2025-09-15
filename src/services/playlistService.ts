import { Playlist, Track, RecognitionResult } from '../types';
import { youtubeService } from './youtubeService';
import { acoustidService } from './acoustidService';
import { auddService } from './auddService';
import { lastfmService } from './lastfmService';
import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';

class PlaylistService {
  private musicService = youtubeService;

  async generateMagicMatchPlaylist(fingerprint?: string, seedTrack?: Track): Promise<Playlist> {
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
          // Get YouTube recommendations based on the recognized/seed track
          try {
            // Search for similar tracks on YouTube
            const searchQuery = `${baseTrack.artist} ${baseTrack.title} similar music`;
            tracks = await this.musicService.searchTracks(searchQuery, 15);
            
            // Enhance with Last.fm similar tracks if available
            if (tracks.length < 10 && lastfmService.isConfigured()) {
              try {
                const similarTracks = await lastfmService.getSimilarTracks(
                  baseTrack.artist,
                  baseTrack.title,
                  10
                );
                tracks = [...tracks, ...similarTracks];
              } catch (error) {
                logger.warn('PlaylistService', 'Last.fm enhancement failed', error);
              }
            }
          } catch (error) {
            logger.warn('PlaylistService', 'Failed to get track-based recommendations, using genre-based', error);
          }
        }

        // Fallback to genre-based recommendations if track-based failed
        if (tracks.length === 0) {
          tracks = await this.musicService.getRecommendations({
            seed_genres: ['electronic', 'house', 'techno'],
            limit: 15
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
          low: 'low',
          medium: 'medium', 
          high: 'high'
        };

        const energy = energyMap[energyLevel];
        const genres = [vibe.toLowerCase()];

        const tracks = await this.musicService.getRecommendations({
          seed_genres: genres,
          limit: 20,
          vibe: vibe.toLowerCase(),
          energy: energy
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
        // Try AudD first (faster for real-time)
        if (auddService.isConfigured()) {
          try {
            const result = await auddService.recognizeAudio(fingerprint);
            if (result) {
              return result;
            }
          } catch (error) {
            logger.warn('PlaylistService', 'AudD recognition failed', error);
          }
        }
        
        // Fallback to AcoustID
        if (acoustidService.isConfigured()) {
          try {
            const result = await acoustidService.recognizeFingerprint(fingerprint, 30);
            if (result) {
              return result;
            }
          } catch (error) {
            logger.warn('PlaylistService', 'AcoustID recognition failed', error);
          }
        }
        
        return null;
      },
      { fingerprint }
    );
  }

  private async enhancedRecognition(fingerprint: string): Promise<RecognitionResult | null> {
    return logger.trackOperation(
      'PlaylistService',
      'enhancedRecognition',
      async () => {
        // Try multiple recognition strategies
        const strategies = [];
        
        if (auddService.isConfigured()) {
          strategies.push(() => auddService.recognizeAudio(fingerprint));
        }
        
        if (acoustidService.isConfigured()) {
          strategies.push(() => acoustidService.recognizeFingerprint(fingerprint, 30));
        }
        
        // Try each strategy with timeout
        for (const strategy of strategies) {
          try {
            const result = await Promise.race([
              strategy(),
              new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
              )
            ]);
            
            if (result) {
              return result;
            }
          } catch (error) {
            logger.debug('PlaylistService', 'Recognition strategy failed', error);
          }
        }
        
        return null;
      },
      { fingerprint }
    );
  }
  async recognizeFromAudioFile(file: File): Promise<Track | null> {
    return logger.trackOperation(
      'PlaylistService',
      'recognizeFromAudioFile',
      async () => {
        // Try direct file recognition with AudD
        if (auddService.isConfigured()) {
          try {
            const result = await auddService.recognizeAudio(file);
            if (result) {
              return {
                id: `recognized-${Date.now()}`,
                title: result.title,
                artist: result.artist,
                album: result.album,
                duration: result.duration || 180,
                preview_url: result.preview_url,
                spotify_id: result.spotify_id
              };
            }
          } catch (error) {
            logger.warn('PlaylistService', 'Direct file recognition failed', error);
          }
        }
        
        return null;
      },
      { fileName: file.name, fileSize: file.size }
    );
  }
}

export const playlistService = new PlaylistService();