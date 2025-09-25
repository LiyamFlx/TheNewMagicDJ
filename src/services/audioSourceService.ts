import { Track } from '../types/index';
import { spotifyPlaybackService } from './spotifyPlaybackService';

export type AudioSourceType = 'youtube' | 'spotify' | 'direct';

export interface AudioSource {
  type: AudioSourceType;
  url: string;
  title?: string;
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

/**
 * Audio source service that provides real audio sources for tracks from streaming platforms
 */
class AudioSourceService {
  // Simple in-memory cache for resolved sources per track
  private resolveCache = new Map<string, { sources: AudioSource[]; expiry: number }>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  private resolvePriority(sources: AudioSource[]): AudioSource[] {
    // Priority: youtube (full) > direct (full) > spotify (preview)
    const weight: Record<AudioSourceType, number> = {
      youtube: 0,
      direct: 1,
      spotify: 2,
    } as const;

    // Deduplicate by a stable key (prefer metadata.videoId or url)
    const seen = new Set<string>();
    const keyOf = (s: AudioSource) =>
      s.type === 'youtube' ? `yt:${s.metadata?.videoId || ''}` : `url:${s.url}`;

    const filtered = sources.filter(s => {
      const k = keyOf(s);
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return filtered.sort((a, b) => (weight[a.type] ?? 99) - (weight[b.type] ?? 99));
  }
  /**
   * Get real audio sources for a track from streaming platforms
   */
  async getAudioSourcesForTrack(track: Track): Promise<AudioSource[]> {
    const cacheKey = String(track.id || track.title || '');
    const now = Date.now();
    const cached = this.resolveCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return cached.sources;
    }

    const sources: AudioSource[] = [];

    // Priority 1: YouTube tracks (full-length via iframe player)
    // Accept multiple hints: album === 'YouTube', youtube_id, youtube_url
    const videoIdFromUrl = (url?: string) => {
      if (!url) return '';
      try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        if (u.hostname.includes('youtube.com')) {
          const v = u.searchParams.get('v');
          if (v) return v;
          // Shorts or embed
          const parts = u.pathname.split('/');
          const idx = parts.findIndex(p => p === 'shorts' || p === 'embed');
          if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
        }
      } catch {}
      return '';
    };

    const videoId =
      (track.youtube_id as string) ||
      videoIdFromUrl(track.youtube_url) ||
      (track.album === 'YouTube' ? track.id : '');

    if (videoId) {
      sources.push({
        type: 'youtube' as AudioSourceType,
        url: '', // Iframe player handles playback
        title: track.title,
        duration: track.duration || 180,
        quality: 'high',
        metadata: {
          videoId, // YouTube video ID for iframe player
        },
      });
    }

    // Priority 2: Spotify preview URL (30-second clips)
    if (track.preview_url) {
      sources.push({
        type: 'spotify' as AudioSourceType,
        url: track.preview_url,
        title: track.title,
        duration: 30, // Spotify previews are 30 seconds
        quality: 'high',
      });
    }

    // Priority 3: Direct source URL (proxy, local, or pre-resolved)
    if (track.source_url && typeof track.source_url === 'string') {
      const url = track.source_url;
      const isAudio =
        url.startsWith('blob:') ||
        url.startsWith('data:audio/') ||
        /\.(mp3|wav|m4a|ogg|aac)(\?.*)?$/i.test(url) ||
        url.startsWith('https://');
      if (isAudio) {
        sources.push({
          type: 'direct',
          url,
          title: track.title,
          duration: track.duration || 180,
          quality: 'medium',
        });
      }
    }

    // Do NOT push a spotify: URI as an audio element source; browsers block it.
    // Full-track playback should be handled via Spotify Web Playback SDK separately.

    // If no real sources available, return empty array
    // This forces the application to get real tracks instead of playing demos
    if (sources.length === 0) {
      console.warn(
        `No real audio sources available for track: ${track.title} by ${track.artist}`
      );
    }

    const resolved = this.resolvePriority(sources);
    this.resolveCache.set(cacheKey, { sources: resolved, expiry: now + this.TTL_MS });
    return resolved;
  }

  /**
   * Get the best audio source for a track
   */
  async getBestAudioSource(track: Track): Promise<AudioSource | null> {
    const sources = await this.getAudioSourcesForTrack(track);
    return sources.length > 0 ? sources[0] : null;
  }

  /**
   * Play a full track using Spotify Web Playback SDK (for premium users)
   */
  async playFullTrackOnSpotify(track: Track): Promise<boolean> {
    if (!track.spotify_id) {
      console.warn('No Spotify ID available for track:', track.title);
      return false;
    }

    if (!spotifyPlaybackService.isConnected()) {
      console.warn('Spotify Web Playback not connected');
      return false;
    }

    const spotifyUri = `spotify:track:${track.spotify_id}`;
    return await spotifyPlaybackService.playTrack(spotifyUri);
  }

  /**
   * Initialize Spotify Web Playback with user token
   */
  async initializeSpotifyPlayback(accessToken: string): Promise<boolean> {
    return await spotifyPlaybackService.initialize(accessToken);
  }
}

export const audioSourceService = new AudioSourceService();
