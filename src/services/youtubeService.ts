import { Track } from '../types';
import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimiter';
import { errorHandler } from '../utils/errorHandler';

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      description: string;
      thumbnails: {
        default: { url: string; width: number; height: number };
        medium: { url: string; width: number; height: number };
        high: { url: string; width: number; height: number };
      };
    };
  }>;
}

interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    contentDetails: {
      duration: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: {
        default: { url: string; width: number; height: number };
        medium: { url: string; width: number; height: number };
        high: { url: string; width: number; height: number };
      };
    };
  }>;
}

class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private isConfigured: boolean;

  constructor() {
    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    this.isConfigured = !!this.apiKey;
    if (!this.apiKey) {
      logger.warn('YouTubeService', 'API key not configured');
    }
  }

  async searchTracks(query: string, maxResults: number = 20): Promise<Track[]> {
    return logger.trackOperation(
      'YouTubeService',
      'searchTracks',
      async () => {
        if (!this.apiKey) {
          throw errorHandler.createAuthError('YouTube');
        }

        // Check rate limit
        const limitCheck = await rateLimiter.checkLimit('youtube');
        if (!limitCheck.allowed) {
          const error = errorHandler.createRateLimitError('YouTube', limitCheck.retryAfter || 3000);
          errorHandler.handleError(error);
          throw new Error(error.message);
        }

        const searchParams = new URLSearchParams({
          part: 'snippet',
          q: query,
          type: 'video',
          videoCategoryId: '10', // Music category
          maxResults: maxResults.toString(),
          key: this.apiKey
        });

        const startTime = Date.now();

        try {
          const response = await fetch(`${this.baseUrl}/search?${searchParams.toString()}`);
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('youtube', 'search', responseTime, response.ok);

          if (!response.ok) {
            const error = errorHandler.createAPIError('YouTube', 'search', response.status, response.statusText);
            errorHandler.handleError(error);
            throw new Error(error.message);
          }

          const data: YouTubeSearchResponse = await response.json();
          
          if (!data.items || data.items.length === 0) {
            logger.info('YouTubeService', 'No search results found');
            return [];
          }

          // Get video details for duration
          const videoIds = data.items.map(item => item.id.videoId).join(',');
          const videoDetails = await this.getVideoDetails(videoIds);

          const tracks: Track[] = data.items.map((item, index) => {
            const videoDetail = videoDetails.find(v => v.id === item.id.videoId);
            const duration = videoDetail ? this.parseDuration(videoDetail.contentDetails.duration) : 180;
            
            // Extract artist and title from YouTube title
            const { artist, title } = this.parseTitle(item.snippet.title);

            return {
              id: item.id.videoId,
              title,
              artist,
              duration,
              preview_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              images: [
                {
                  url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
                  height: item.snippet.thumbnails.high?.height || item.snippet.thumbnails.medium?.height || item.snippet.thumbnails.default.height,
                  width: item.snippet.thumbnails.high?.width || item.snippet.thumbnails.medium?.width || item.snippet.thumbnails.default.width
                }
              ],
              // Generate mock audio features for DJ functionality
              bpm: Math.floor(Math.random() * 60) + 100,
              key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)],
              energy: Math.random(),
              danceability: Math.random(),
              valence: Math.random()
            };
          });

          logger.info('YouTubeService', 'Tracks searched successfully', {
            query,
            trackCount: tracks.length
          });

          return tracks;

        } catch (error) {
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('youtube', 'search', responseTime, false);

          if (error instanceof TypeError && error.message.includes('fetch')) {
            const networkError = errorHandler.createNetworkError('YouTube search');
            errorHandler.handleError(networkError);
            throw new Error(networkError.message);
          }

          throw error;
        }
      },
      { query, maxResults }
    );
  }

  async getRecommendations(params: {
    seed_genres?: string[];
    limit?: number;
    vibe?: string;
    energy?: string;
  }): Promise<Track[]> {
    return logger.trackOperation(
      'YouTubeService',
      'getRecommendations',
      async () => {
        const { seed_genres = [], limit = 20, vibe = 'electronic', energy = 'high' } = params;
        
        // Create search queries based on genres and vibe
        const searchQueries = this.buildSearchQueries(seed_genres, vibe, energy);
        const allTracks: Track[] = [];
        
        // Search for tracks using different queries
        for (const query of searchQueries) {
          try {
            const tracks = await this.searchTracks(query, Math.ceil(limit / searchQueries.length));
            allTracks.push(...tracks);
            
            if (allTracks.length >= limit) break;
          } catch (error) {
            logger.warn('YouTubeService', `Search failed for query: ${query}`, error);
          }
        }

        // Remove duplicates and limit results
        const uniqueTracks = this.removeDuplicates(allTracks).slice(0, limit);
        
        logger.info('YouTubeService', 'Recommendations generated successfully', {
          trackCount: uniqueTracks.length,
          vibe,
          energy
        });

        return uniqueTracks;
      },
      params
    );
  }

  private async getVideoDetails(videoIds: string): Promise<Array<{ id: string; contentDetails: { duration: string } }>> {
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: videoIds,
      key: this.apiKey
    });

    try {
      const response = await fetch(`${this.baseUrl}/videos?${params.toString()}`);
      if (!response.ok) return [];
      
      const data: YouTubeVideoResponse = await response.json();
      return data.items.map(item => ({
        id: item.id,
        contentDetails: item.contentDetails
      }));
    } catch (error) {
      logger.warn('YouTubeService', 'Failed to get video details', error);
      return [];
    }
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration (PT4M13S -> 253 seconds)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 180; // Default 3 minutes
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  private parseTitle(title: string): { artist: string; title: string } {
    // Common patterns in YouTube music titles
    const patterns = [
      /^(.+?)\s*[-–—]\s*(.+?)(?:\s*\(.*\))?(?:\s*\[.*\])?$/,
      /^(.+?)\s*[:|]\s*(.+?)(?:\s*\(.*\))?(?:\s*\[.*\])?$/,
      /^(.+?)\s*by\s*(.+?)(?:\s*\(.*\))?(?:\s*\[.*\])?$/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          artist: match[2].trim(),
          title: match[1].trim()
        };
      }
    }

    // If no pattern matches, try to extract from common formats
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim()
      };
    }

    // Fallback: use channel name as artist if available
    return {
      artist: 'Unknown Artist',
      title: title.replace(/\s*\(.*\)|\s*\[.*\]/g, '').trim()
    };
  }

  private buildSearchQueries(genres: string[], vibe: string, energy: string): string[] {
    const energyTerms = {
      low: ['chill', 'ambient', 'relaxed', 'downtempo'],
      medium: ['groove', 'melodic', 'progressive'],
      high: ['upbeat', 'energetic', 'dance', 'club']
    };

    const genreMap: { [key: string]: string[] } = {
      electronic: ['electronic music', 'EDM', 'electronica'],
      house: ['house music', 'deep house', 'tech house'],
      techno: ['techno music', 'minimal techno', 'detroit techno'],
      'hip-hop': ['hip hop music', 'rap music', 'hip hop beats'],
      pop: ['pop music', 'popular music', 'top hits'],
      dance: ['dance music', 'club music', 'party music']
    };

    const queries: string[] = [];
    const energyWords = energyTerms[energy as keyof typeof energyTerms] || energyTerms.medium;

    // Generate queries based on genres
    if (genres.length > 0) {
      genres.forEach(genre => {
        const genreTerms = genreMap[genre] || [genre];
        genreTerms.forEach(term => {
          energyWords.forEach(energyWord => {
            queries.push(`${term} ${energyWord} mix`);
          });
        });
      });
    } else {
      // Fallback queries based on vibe
      const vibeTerms = genreMap[vibe] || [vibe];
      vibeTerms.forEach(term => {
        energyWords.forEach(energyWord => {
          queries.push(`${term} ${energyWord} playlist`);
        });
      });
    }

    return queries.slice(0, 3); // Limit to 3 queries to avoid rate limits
  }

  private removeDuplicates(tracks: Track[]): Track[] {
    const seen = new Set<string>();
    return tracks.filter(track => {
      const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  isConfigured(): boolean {
    return this.isConfigured;
  }

  getRemainingRequests(): number {
    return rateLimiter.getRemainingRequests('youtube');
  }

  // Fallback method for when API is not configured
  async getFallbackTracks(query: string, limit: number = 20): Promise<Track[]> {
    const fallbackTracks: Track[] = [];
    
    const genres = ['Electronic', 'House', 'Techno', 'Hip-Hop', 'Pop', 'Dance'];
    const artists = ['DJ Shadow', 'Daft Punk', 'Calvin Harris', 'Deadmau5', 'Skrillex', 'Tiësto'];
    
    for (let i = 0; i < limit; i++) {
      const genre = genres[i % genres.length];
      const artist = artists[i % artists.length];
      
      fallbackTracks.push({
        id: `fallback-${i}`,
        title: `${genre} Track ${i + 1}`,
        artist: artist,
        album: `${genre} Collection`,
        duration: 180 + Math.floor(Math.random() * 120),
        bpm: Math.floor(Math.random() * 60) + 100,
        key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
        energy: Math.random(),
        danceability: Math.random(),
        valence: Math.random(),
        preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      });
    }
    
    return fallbackTracks;
  }
}

export const youtubeService = new YouTubeService();