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
    // Create a proper WAV file programmatically without AudioContext
    // This generates a 5-second 440Hz sine wave
    const sampleRate = 22050;
    const duration = 5; // 5 seconds
    const numSamples = sampleRate * duration;

    // Create WAV header
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate audio data (440Hz sine wave)
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3;
      view.setInt16(offset, sample * 32767, true);
      offset += 2;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
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
        duration: 5,
        quality: 'medium',
        metadata: { generated: true }
      });
    } catch (error) {
      // Fallback - create a minimal working WAV if blob creation fails
      console.warn('Audio generation failed, using minimal fallback');
      // Use a simple silence as final fallback
      sources.push({
        type: 'demo',
        url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
        title: `${track.title} (Silence)`,
        duration: 1,
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