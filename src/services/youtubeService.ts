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
    // Demo audio sources for fallback tracks
    const demoAudioSources = [
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    ];

    // If no API key, avoid calling YouTube API entirely
    if (!this.apiKey) {
      const tracks: Track[] = [];
      for (let i = 0; i < count; i++) {
        tracks.push({
          id: `yt-fallback-${Date.now()}-${i}`,
          title: `${(seed || 'Electronic mix').trim()} – Fallback ${i + 1}`,
          artist: 'Demo Artist',
          album: 'Demo Collection',
          duration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
          preview_url: demoAudioSources[i % demoAudioSources.length],
          bpm: Math.floor(Math.random() * 60) + 100, // 100-160 BPM
          key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
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
        tracks.push({
          id: `yt-fallback-${Date.now()}-${i}`,
          title: `${(seed || 'Electronic mix').trim()} – Fallback ${i + 1}`,
          artist: 'Demo Artist',
          album: 'Demo Collection',
          duration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
          preview_url: demoAudioSources[i % demoAudioSources.length],
          bpm: Math.floor(Math.random() * 60) + 100, // 100-160 BPM
          key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
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
