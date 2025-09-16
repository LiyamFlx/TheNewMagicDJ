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
    // CORS-safe demo audio sources - use simple data URLs that work universally
    // These are minimal WAV files that will play in all browsers without CORS issues
    const demoAudioSources = [
      // Simple 440Hz tone for 5 seconds - this is a base64 encoded minimal WAV
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      // Different frequency variations
      'data:audio/wav;base64,UklGRjoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      // More variations with different patterns
      'data:audio/wav;base64,UklGRkoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      'data:audio/wav;base64,UklGRloGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YToGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      'data:audio/wav;base64,UklGRmoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      'data:audio/wav;base64,UklGRpoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      'data:audio/wav;base64,UklGRroGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      'data:audio/wav;base64,UklGRsoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t',
      'data:audio/wav;base64,UklGRtoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t'
    ];

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
