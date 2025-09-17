import { Track } from '../types/index';

export type AudioSourceType = 'youtube';

export interface AudioSource {
  type: AudioSourceType;
  url: string;
  title?: string;
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

/**
 * Simple audio source service that returns YouTube URLs for tracks
 */
class AudioSourceService {

  /**
   * Get audio sources for a track - just return the YouTube URL
   */
  async getAudioSourcesForTrack(track: Track): Promise<AudioSource[]> {
    // If track has a preview_url that's a YouTube URL, use it
    if (track.preview_url && track.preview_url.includes('youtube.com')) {
      return [{
        type: 'youtube',
        url: track.preview_url,
        title: track.title,
        duration: track.duration,
        quality: 'medium'
      }];
    }

    // If track has a Spotify ID, search YouTube for it
    if (track.spotify_id) {
      const searchQuery = `${track.artist} ${track.title}`;
      // Return YouTube search URL that the player can handle
      return [{
        type: 'youtube',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
        title: track.title,
        duration: track.duration,
        quality: 'medium'
      }];
    }

    // Fallback - just search YouTube for the track
    const searchQuery = `${track.artist} ${track.title}`;
    return [{
      type: 'youtube',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
      title: track.title,
      duration: track.duration,
      quality: 'medium'
    }];
  }

  /**
   * Get the best audio source for a track
   */
  async getBestAudioSource(track: Track): Promise<AudioSource | null> {
    const sources = await this.getAudioSourcesForTrack(track);
    return sources.length > 0 ? sources[0] : null;
  }
}

export const audioSourceService = new AudioSourceService();