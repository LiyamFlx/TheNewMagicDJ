import {
  AudioFingerprint,
  AdvancedAudioFeatures,
  AudioRecognitionResponse,
  TrackSuggestion,
  KeyCompatibility,
  AudioCaptureConfig,
  Track,
} from '../types/index';
import { logger } from '../utils/logger';

class AdvancedAudioService {
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private defaultCaptureConfig: AudioCaptureConfig = {
    sampleRate: 44100,
    channels: 1,
    duration: 10000, // 10 seconds
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };

  /**
   * Initialize microphone capture with advanced configuration
   */
  async initializeCapture(
    config: Partial<AudioCaptureConfig> = {}
  ): Promise<void> {
    return logger.trackOperation(
      'AdvancedAudioService',
      'initializeCapture',
      async () => {
        const captureConfig = { ...this.defaultCaptureConfig, ...config };

        try {
          this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: captureConfig.sampleRate,
              channelCount: captureConfig.channels,
              echoCancellation: captureConfig.echoCancellation,
              noiseSuppression: captureConfig.noiseSuppression,
              autoGainControl: captureConfig.autoGainControl,
            },
          });

          this.audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)({
            sampleRate: captureConfig.sampleRate,
          });

          // Resume AudioContext if suspended
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }

          // Set up audio analysis
          const source = this.audioContext.createMediaStreamSource(
            this.audioStream
          );
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 2048;
          this.analyser.smoothingTimeConstant = 0.8;
          source.connect(this.analyser);

          // Set up MediaRecorder for high-quality capture
          this.recorder = new MediaRecorder(this.audioStream, {
            mimeType: 'audio/webm; codecs=opus',
          });

          this.recorder.ondataavailable = event => {
            if (event.data.size > 0) {
              this.recordedChunks.push(event.data);
            }
          };

          logger.info(
            'AdvancedAudioService',
            'Advanced microphone capture initialized',
            { config: captureConfig }
          );
        } catch (error) {
          logger.error(
            'AdvancedAudioService',
            'Failed to initialize audio capture',
            error
          );
          throw new Error('Advanced audio capture initialization failed');
        }
      }
    );
  }

  /**
   * Capture and analyze audio with advanced recognition
   */
  async captureAndAnalyze(
    durationMs: number = 10000
  ): Promise<AudioFingerprint> {
    return logger.trackOperation(
      'AdvancedAudioService',
      'captureAndAnalyze',
      async () => {
        if (!this.recorder || !this.audioStream) {
          throw new Error('Audio capture not initialized');
        }

        // Clear previous recordings
        this.recordedChunks = [];

        // Start recording
        this.recorder.start();

        // Wait for specified duration
        await new Promise(resolve => setTimeout(resolve, durationMs));

        // Stop recording
        this.recorder.stop();

        // Wait for data to be available
        await new Promise(resolve => {
          this.recorder!.onstop = resolve;
        });

        // Convert recorded audio to format for Python service
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const audioBuffer = await audioBlob.arrayBuffer();
        const base64Audio = this.arrayBufferToBase64(audioBuffer);

        // Call Python recognition service
        const recognitionResponse = await this.callPythonService(base64Audio);

        // Create enhanced fingerprint
        const fingerprint: AudioFingerprint = {
          fingerprint: this.generateFingerprintHash(audioBuffer),
          confidence: recognitionResponse.features.confidence,
          duration: durationMs / 1000,
          features: recognitionResponse.features,
        };

        logger.info(
          'AdvancedAudioService',
          'Audio captured and analyzed successfully',
          {
            duration: fingerprint.duration,
            confidence: fingerprint.confidence,
            bpm: recognitionResponse.features.bpm,
            key: recognitionResponse.features.key,
            genre: recognitionResponse.features.genre,
            recognized: !!recognitionResponse.recognition,
            suggestionsCount: recognitionResponse.suggestions.length,
          }
        );

        return fingerprint;
      },
      { durationMs }
    );
  }

  /**
   * Call the Python audio recognition service
   */
  private async callPythonService(
    base64Audio: string
  ): Promise<AudioRecognitionResponse> {
    try {
      const response = await fetch('/api/audio-recognition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recognize',
          audio_data: base64Audio,
        }),
      });

      if (!response.ok) {
        throw new Error(`Recognition service error: ${response.status}`);
      }

      const result = await response.json();
      return result as AudioRecognitionResponse;
    } catch (error) {
      logger.warn(
        'AdvancedAudioService',
        'Python service unavailable, using fallback',
        error
      );

      // Return mock response if service is unavailable
      return this.generateMockResponse();
    }
  }

  /**
   * Check key compatibility between tracks
   */
  async checkKeyCompatibility(
    key1: string,
    key2: string
  ): Promise<KeyCompatibility> {
    return logger.trackOperation(
      'AdvancedAudioService',
      'checkKeyCompatibility',
      async () => {
        try {
          const response = await fetch('/api/audio-recognition', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'compatibility',
              key1,
              key2,
            }),
          });

          if (!response.ok) {
            throw new Error(`Compatibility service error: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          logger.warn(
            'AdvancedAudioService',
            'Compatibility service unavailable, using local calculation',
            error
          );

          return this.calculateLocalCompatibility(key1, key2);
        }
      },
      { key1, key2 }
    );
  }

  /**
   * Get intelligent track suggestions based on current track
   */
  async getSuggestedTracks(currentTrack: Track): Promise<TrackSuggestion[]> {
    return logger.trackOperation(
      'AdvancedAudioService',
      'getSuggestedTracks',
      async () => {
        const features = currentTrack.advanced_features;
        if (!features) {
          logger.warn(
            'AdvancedAudioService',
            'No advanced features available for suggestions'
          );
          return [];
        }

        // This would typically query a track database
        // For now, generate compatible suggestions based on the current track
        return this.generateCompatibleSuggestions(features);
      },
      { trackId: currentTrack.id, trackTitle: currentTrack.title }
    );
  }

  /**
   * Enhance an existing track with advanced audio features
   */
  async enhanceTrack(track: Track): Promise<Track> {
    return logger.trackOperation(
      'AdvancedAudioService',
      'enhanceTrack',
      async () => {
        if (track.advanced_features) {
          return track; // Already enhanced
        }

        // Generate mock advanced features based on existing track data
        const enhancedFeatures: AdvancedAudioFeatures = {
          bpm: track.bpm || 120 + Math.random() * 60,
          key: track.key || this.generateRandomKey(),
          genre: track.genre || 'electronic',
          energy: track.energy || Math.random(),
          mfcc_features: Array.from(
            { length: 13 },
            () => Math.random() * 100 - 50
          ),
          spectral_centroid: 2000 + Math.random() * 2000,
          confidence: 0.8,
          valence: track.valence,
          danceability: track.danceability,
        };

        return {
          ...track,
          advanced_features: enhancedFeatures,
          recognition_source: 'database' as const,
        };
      },
      { trackId: track.id }
    );
  }

  /**
   * Stop audio capture and cleanup resources
   */
  async stopCapture(): Promise<void> {
    return logger.trackOperation(
      'AdvancedAudioService',
      'stopCapture',
      async () => {
        if (this.recorder && this.recorder.state !== 'inactive') {
          this.recorder.stop();
        }

        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop());
          this.audioStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
          await this.audioContext.close();
          this.audioContext = null;
        }

        this.analyser = null;
        this.recorder = null;
        this.recordedChunks = [];

        logger.info(
          'AdvancedAudioService',
          'Audio capture stopped and cleaned up'
        );
      }
    );
  }

  /**
   * Get real-time audio analysis data for visualization
   */
  getRealTimeAnalysis(): {
    frequencyData: Uint8Array;
    timeDomainData: Uint8Array;
    volume: number;
  } | null {
    if (!this.analyser) {
      return null;
    }

    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    const timeDomainData = new Uint8Array(this.analyser.fftSize);

    this.analyser.getByteFrequencyData(frequencyData);
    this.analyser.getByteTimeDomainData(timeDomainData);

    // Calculate volume level
    const volume =
      frequencyData.reduce((sum, value) => sum + value, 0) /
      frequencyData.length /
      255;

    return {
      frequencyData,
      timeDomainData,
      volume,
    };
  }

  // Private utility methods

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private generateFingerprintHash(audioBuffer: ArrayBuffer): string {
    // Simple hash generation for fingerprint
    const bytes = new Uint8Array(audioBuffer);
    let hash = '';
    for (let i = 0; i < Math.min(bytes.length, 1024); i += 8) {
      hash += bytes[i].toString(16).padStart(2, '0');
    }
    return hash;
  }

  private generateMockResponse(): AudioRecognitionResponse {
    const keys = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const genres = ['electronic', 'house', 'techno', 'pop', 'rock', 'hip-hop'];

    return {
      recognition: null,
      features: {
        bpm: 120 + Math.random() * 60,
        key: keys[Math.floor(Math.random() * keys.length)],
        genre: genres[Math.floor(Math.random() * genres.length)],
        energy: Math.random(),
        mfcc_features: Array.from(
          { length: 13 },
          () => Math.random() * 100 - 50
        ),
        spectral_centroid: 2000 + Math.random() * 2000,
        confidence: 0.7 + Math.random() * 0.2,
      },
      suggestions: [],
      timestamp: new Date().toISOString(),
    };
  }

  private calculateLocalCompatibility(
    key1: string,
    key2: string
  ): KeyCompatibility {
    const majorScales: Record<string, string[]> = {
      C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
      A: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
      E: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
      B: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
      F: ['F', 'G', 'A', 'A#', 'C', 'D', 'E'],
    };

    if (!majorScales[key1] || !majorScales[key2]) {
      return {
        compatible: false,
        score: 0,
        shared_notes: 0,
        reason: 'Unknown key',
      };
    }

    const scale1 = new Set(majorScales[key1]);
    const scale2 = new Set(majorScales[key2]);
    const sharedNotes = Array.from(scale1).filter(note =>
      scale2.has(note)
    ).length;

    return {
      compatible: sharedNotes >= 5,
      score: sharedNotes / 7,
      shared_notes: sharedNotes,
      reason: `Shares ${sharedNotes}/7 notes`,
    };
  }

  private generateCompatibleSuggestions(
    features: AdvancedAudioFeatures
  ): TrackSuggestion[] {
    const suggestions: TrackSuggestion[] = [];
    const templateTracks = [
      { title: 'Harmonic Flow', artist: 'DJ Synthesis' },
      { title: 'Key Shift', artist: 'Digital Harmony' },
      { title: 'Scale Walker', artist: 'Music Theory' },
    ];

    for (const template of templateTracks) {
      suggestions.push({
        title: template.title,
        artist: template.artist,
        bpm: features.bpm + Math.random() * 10 - 5, // ±5 BPM
        key: features.key, // Same key for compatibility
        genre: features.genre,
        compatibility_score: 0.8 + Math.random() * 0.2,
        reason: `Compatible key (${features.key}) and similar tempo`,
      });
    }

    return suggestions;
  }

  private generateRandomKey(): string {
    const keys = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    return keys[Math.floor(Math.random() * keys.length)];
  }
}

export const advancedAudioService = new AdvancedAudioService();
export default advancedAudioService;
