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
   * Create a simple beep audio using Web Audio API
   */
  private createBeepAudio(): string {
    // Return a working base64 audio file instead of trying to generate
    return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUeCjiMzPPaeSwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmUeBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcCjiMzPPaeSwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmUe';
  }



  /**
   * Get audio sources for a track
   */
  async getAudioSourcesForTrack(track: Track): Promise<AudioSource[]> {
    console.log('🎵 AUDIO SERVICE CALLED - Getting audio sources for track:', track.title);
    window.alert('Audio service called for: ' + track.title); // Temporary debug alert
    const sources: AudioSource[] = [];

    // If track has a URL property, try to use it directly
    if (track.url) {
      console.log('📎 Adding track URL:', track.url);
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
      console.log('🎧 Adding preview URL:', track.preview_url);
      sources.push({
        type: 'demo',
        url: track.preview_url,
        title: track.title,
        duration: track.duration,
        quality: 'medium'
      });
    }

    // Create a simple beep audio using Web Audio API
    try {
      const beepAudio = this.createBeepAudio();
      console.log('🔊 Created beep audio URL:', beepAudio.substring(0, 50) + '...');
      sources.push({
        type: 'demo',
        url: beepAudio,
        title: `${track.title} (Beep)`,
        duration: 5,
        quality: 'medium',
        metadata: { generated: true }
      });
    } catch (error) {
      console.error('❌ Failed to create beep audio:', error);
    }

    // Always provide a demo audio fallback
    const fallbackAudio = this.generateDemoAudio(track);
    console.log('🔇 Adding fallback audio URL:', fallbackAudio.substring(0, 50) + '...');
    sources.push({
      type: 'demo',
      url: fallbackAudio,
      title: `${track.title} (Silent)`,
      duration: track.duration || 5,
      quality: 'medium',
      metadata: { fallback: true }
    });

    console.log(`✅ Total ${sources.length} audio sources created for ${track.title}`);
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