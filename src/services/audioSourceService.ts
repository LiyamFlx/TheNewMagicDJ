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
   * Create a simple working audio blob
   */
  private createWorkingAudio(): string {
    // Create a longer working WAV file for proper DJ testing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 30; // 30 seconds for proper testing
    const sampleRate = 22050; // Lower sample rate for smaller file
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);

    // Generate a more interesting audio pattern - bass line with rhythm
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      const beat = Math.floor(time * 2) % 4; // 120 BPM beat pattern
      const bassFreq = beat === 0 || beat === 2 ? 80 : 100; // Kick pattern
      const volume = beat === 0 ? 0.3 : 0.1; // Accent on beats 1 and 3

      data[i] = Math.sin(2 * Math.PI * bassFreq * time) * volume;
    }

    // Convert to WAV
    const arrayBuffer = this.encodeWAV(buffer);
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * Encode AudioBuffer to WAV format
   */
  private encodeWAV(buffer: AudioBuffer): ArrayBuffer {
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
    const data = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
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

    // Add working generated audio
    try {
      const workingAudio = this.createWorkingAudio();
      sources.push({
        type: 'demo',
        url: workingAudio,
        title: `${track.title} (Demo)`,
        duration: 30,
        quality: 'medium',
        metadata: { generated: true }
      });
    } catch (error) {
      // Fallback to base64 audio if generation fails
      sources.push({
        type: 'demo',
        url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUe',
        title: `${track.title} (Fallback)`,
        duration: 30,
        quality: 'medium',
        metadata: { fallback: true }
      });
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
}

export const audioSourceService = new AudioSourceService();