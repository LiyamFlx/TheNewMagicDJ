import { Track } from "../types";
import { logger } from "../utils/logger";
import { errorHandler } from "../utils/errorHandler";
import { fetchWithRetry } from "../utils/http";

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: { title: string; channelTitle: string };
  }>;
}

export class YouTubeService {
  private apiKey: string;
  private baseUrl = "https://www.googleapis.com/youtube/v3";

  constructor() {
    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || "";
  }

  async searchTracks(query: string, maxResults: number = 10): Promise<Track[]> {
    try {
      const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        maxResults: String(maxResults),
        key: this.apiKey,
      });

      const res = await fetchWithRetry(`${this.baseUrl}/search?${params.toString()}` , {
        method: 'GET'
      }, { timeoutMs: 12000, retries: 2 });
      if (!res.ok) throw new Error(`YouTube API error: ${res.statusText}`);

      const data: YouTubeSearchResponse = await res.json();

      return data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album: "YouTube",
        duration: 0,
        bpm: undefined,
      }));
    } catch (error) {
      logger.error("YouTubeService", "Search failed", error);
      throw errorHandler.createAPIError("YouTube", "search", 500, "Search failed");
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async getRecommendations(params: { seed_genres?: string[]; limit?: number; vibe?: string; energy?: string }): Promise<Track[]> {
    const terms = [
      ...(params.seed_genres || []),
      params.vibe || '',
      params.energy || '',
      'music mix'
    ]
      .filter(Boolean)
      .join(' ');
    const q = terms || 'electronic music mix';
    const limit = params.limit ?? 15;
    return this.searchTracks(q, limit);
  }

  async getFallbackTracks(seed: string, count: number): Promise<Track[]> {
    // Function to generate proper WAV data URL with audible content
    const generateAudioDataUrl = (frequency: number, durationSeconds: number = 10): string => {
      const sampleRate = 22050; // Lower sample rate for smaller file size
      const samples = sampleRate * durationSeconds;
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + samples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, samples * 2, true);

      // Generate audio data - musical tone with envelope
      for (let i = 0; i < samples; i++) {
        const time = i / sampleRate;

        // Create envelope for fade in/out
        const fadeTime = 0.1;
        const fadeIn = Math.min(1, time / fadeTime);
        const fadeOut = Math.min(1, (durationSeconds - time) / fadeTime);
        const envelope = Math.min(fadeIn, fadeOut);

        // Generate musical tone with harmonics
        const fundamental = Math.sin(2 * Math.PI * frequency * time);
        const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.3;
        const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * time) * 0.1;

        // Add some rhythm variation
        const rhythm = (Math.floor(time * 2) % 2) * 0.1 + 0.9;

        const sample = (fundamental + harmonic2 + harmonic3) * envelope * rhythm * 0.5;
        const intSample = Math.max(-32767, Math.min(32767, sample * 32767));
        view.setInt16(44 + i * 2, intSample, true);
      }

      // Convert to base64
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:audio/wav;base64,${btoa(binary)}`;
    };

    // Generate proper audio sources with different musical notes
    const musicalFrequencies = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440, 493.88, 523.25]; // A3 to C5
    const demoAudioSources = musicalFrequencies.map(freq => generateAudioDataUrl(freq, 15));

    // Genre-specific track titles for better UX
    const genreTitles = {
      house: ['House Anthem', 'Deep Groove', 'Progressive Beat', 'Club Banger', 'Underground Mix'],
      electronic: ['Synth Wave', 'Digital Dreams', 'Cyber Beats', 'Electronic Symphony', 'Tech Fusion'],
      techno: ['Industrial Pulse', 'Berlin Nights', 'Minimal Tech', 'Dark Energy', 'Warehouse Vibe'],
      'hip-hop': ['Urban Flow', 'Street Beats', 'Boom Bap', 'Trap Anthem', 'Old School']
    };

    const genre = (seed.toLowerCase().includes('house') && 'house') ||
                  (seed.toLowerCase().includes('techno') && 'techno') ||
                  (seed.toLowerCase().includes('hip') && 'hip-hop') ||
                  'electronic';

    const titles = genreTitles[genre as keyof typeof genreTitles] || genreTitles.electronic;

    // If no API key, avoid calling YouTube API entirely
    if (!this.apiKey) {
      const tracks: Track[] = [];
      for (let i = 0; i < count; i++) {
        const baseTitle = titles[i % titles.length];
        const artist = `${genre.charAt(0).toUpperCase() + genre.slice(1)} Artist ${i + 1}`;

        tracks.push({
          id: `yt-fallback-${Date.now()}-${i}`,
          title: baseTitle,
          artist: artist,
          album: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Collection`,
          duration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
          preview_url: demoAudioSources[i % demoAudioSources.length],
          bpm: Math.floor(Math.random() * 60) + 100, // 100-160 BPM
          key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)],
          energy: Math.random(),
          danceability: Math.random(),
          valence: Math.random()
        });
      }
      return tracks;
    }

    // With API key present, try a real search but still degrade gracefully
    try {
      return this.searchTracks(seed || 'electronic music mix', count);
    } catch {
      const tracks: Track[] = [];
      for (let i = 0; i < count; i++) {
        const baseTitle = titles[i % titles.length];
        const artist = `${genre.charAt(0).toUpperCase() + genre.slice(1)} Artist ${i + 1}`;

        tracks.push({
          id: `yt-fallback-${Date.now()}-${i}`,
          title: baseTitle,
          artist: artist,
          album: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Collection`,
          duration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
          preview_url: demoAudioSources[i % demoAudioSources.length],
          bpm: Math.floor(Math.random() * 60) + 100, // 100-160 BPM
          key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)],
          energy: Math.random(),
          danceability: Math.random(),
          valence: Math.random()
        });
      }
      return tracks;
    }
  }
}

export const youtubeService = new YouTubeService();
