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
    try {
      // Create AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create a buffer for 5 seconds at 44.1kHz
      const duration = 5;
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);

      // Fill the buffer with a simple tone
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        // 440Hz sine wave (A note)
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
      }

      // Convert buffer to WAV blob
      const wavBlob = this.bufferToWav(buffer);
      return URL.createObjectURL(wavBlob);
    } catch (error) {
      console.error('Failed to create beep audio:', error);
      // Return the silent audio fallback
      return this.generateDemoAudio({} as Track);
    }
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private bufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float32 to int16
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }


  /**
   * Get audio sources for a track
   */
  async getAudioSourcesForTrack(track: Track): Promise<AudioSource[]> {
    console.log('🎵 Getting audio sources for track:', track.title);
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