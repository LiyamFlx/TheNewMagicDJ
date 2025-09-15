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
    // If no API key, avoid calling YouTube API entirely
    if (!this.apiKey) {
      const tracks: Track[] = [];
      for (let i = 0; i < count; i++) {
        tracks.push({
          id: `yt-fallback-${Date.now()}-${i}`,
          title: `${(seed || 'Electronic mix').trim()} – Fallback ${i + 1}`,
          artist: 'YouTube',
          album: 'YouTube',
          duration: 0,
          preview_url: undefined,
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
          artist: 'YouTube',
          album: 'YouTube',
          duration: 0,
          preview_url: undefined,
        });
      }
      return tracks;
    }
  }
}

export const youtubeService = new YouTubeService();
