import { Track } from '../types/index';
import { spotifyPlaybackService } from './spotifyPlaybackService';

export type AudioSourceType = 'youtube' | 'spotify';

export interface AudioSource {
  type: AudioSourceType;
  url: string;
  title?: string;
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

/**
 * Audio source service that provides real audio sources for tracks from streaming platforms
 */
class AudioSourceService {

  /**
   * Get real audio sources for a track from streaming platforms
   */
  async getAudioSourcesForTrack(track: Track): Promise<AudioSource[]> {
    const sources: AudioSource[] = [];

    // Priority 1: YouTube tracks (full-length via iframe player)
    if (track.album === 'YouTube' && track.id) {
      sources.push({
        type: 'youtube' as AudioSourceType,
        url: '', // No direct URL - iframe player handles this
        title: track.title,
        duration: track.duration || 180,
        quality: 'high',
        metadata: {
          videoId: track.id, // YouTube video ID for iframe player
        }
      });
    }

    // Priority 2: Spotify preview URL (30-second clips)
    if (track.preview_url) {
      sources.push({
        type: 'spotify' as AudioSourceType,
        url: track.preview_url,
        title: track.title,
        duration: 30, // Spotify previews are 30 seconds
        quality: 'high'
      });
    }

    // Do NOT push a spotify: URI as an audio element source; browsers block it.
    // Full-track playback should be handled via Spotify Web Playback SDK separately.

    // If no real sources available, return empty array
    // This forces the application to get real tracks instead of playing demos
    if (sources.length === 0) {
      console.warn(`No real audio sources available for track: ${track.title} by ${track.artist}`);
    }

    return sources;
  }

  /**
   * Get the best audio source for a track
   */
  async getBestAudioSource(track: Track): Promise<AudioSource | null> {
    const sources = await this.getAudioSourcesForTrack(track);
    return sources.length > 0 ? sources[0] : null;
  }

  /**
   * Play a full track using Spotify Web Playback SDK (for premium users)
   */
  async playFullTrackOnSpotify(track: Track): Promise<boolean> {
    if (!track.spotify_id) {
      console.warn('No Spotify ID available for track:', track.title);
      return false;
    }

    if (!spotifyPlaybackService.isConnected()) {
      console.warn('Spotify Web Playback not connected');
      return false;
    }

    const spotifyUri = `spotify:track:${track.spotify_id}`;
    return await spotifyPlaybackService.playTrack(spotifyUri);
  }

  /**
   * Initialize Spotify Web Playback with user token
   */
  async initializeSpotifyPlayback(accessToken: string): Promise<boolean> {
    return await spotifyPlaybackService.initialize(accessToken);
  }
}

export const audioSourceService = new AudioSourceService();
