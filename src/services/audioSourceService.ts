import { Track } from '../types/index';

export type AudioSourceType = 'youtube' | 'demo';

export interface AudioSource {
  type: AudioSourceType;
  url: string;
  title?: string;
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

/**
 * Audio source service that provides playable audio sources for tracks
 */
class AudioSourceService {

  /**
   * Generate a demo audio URL using Web Audio API
   */
  private generateDemoAudio(_track: Track): string {
    // Simple silent audio data URL for fallback
    return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUe';
  }


  /**
   * Get audio sources for a track
   */
  async getAudioSourcesForTrack(track: Track): Promise<AudioSource[]> {
    const sources: AudioSource[] = [];

    // If track has a URL property, try to use it directly
    if (track.url) {
      sources.push({
        type: 'demo',
        url: track.url,
        title: track.title,
        duration: track.duration,
        quality: 'medium'
      });
    }

    // If track has a preview_url that's a direct audio URL, use it
    if (track.preview_url && (track.preview_url.includes('.mp3') || track.preview_url.includes('.wav') || track.preview_url.includes('.m4a'))) {
      sources.push({
        type: 'demo',
        url: track.preview_url,
        title: track.title,
        duration: track.duration,
        quality: 'medium'
      });
    }

    // For testing: add some real MP3 URLs
    const testAudioUrls = [
      'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
      'https://file-examples.com/storage/fea8c67ce7e2b56e33c8c1b/2017/11/file_example_MP3_700KB.mp3',
      'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3'
    ];

    // Add a test audio URL for immediate functionality
    const testUrl = testAudioUrls[Math.floor(Math.random() * testAudioUrls.length)];
    sources.push({
      type: 'demo',
      url: testUrl,
      title: `${track.title} (Test Audio)`,
      duration: 30,
      quality: 'medium',
      metadata: { test: true }
    });

    // Always provide a demo audio fallback
    sources.push({
      type: 'demo',
      url: this.generateDemoAudio(track),
      title: `${track.title} (Generated)`,
      duration: track.duration || 30,
      quality: 'medium',
      metadata: { generated: true }
    });

    return sources;
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