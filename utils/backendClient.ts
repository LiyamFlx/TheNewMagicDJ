// =============================================================================
// UNIFIED BACKEND CLIENT
// =============================================================================
// Single client for all backend operations with caching, rate limiting, and error handling

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../shared/database.types.js';
import type {
  PlaylistDTO,
  TrackDTO,
  SessionDTO,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackRequest,
  CreateSessionRequest,
  UpdateSessionRequest,
  playlistToDTO,
  trackToDTO,
  sessionToDTO
} from '../shared/dto.js';
import { AppError, normalizeError } from '../src/utils/errors.js';
import { rateLimiter, deduplicator, ApiLogger, type RequestContext } from './apiUtils.js';

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

export interface BackendClientConfig {
  supabaseUrl: string;
  supabaseKey: string;
  rateLimitConfig?: {
    maxRequests: number;
    windowMs: number;
  };
  cacheConfig?: {
    defaultTtlMs: number;
    maxCacheSize: number;
  };
}

export interface BackendClientOptions {
  userId?: string;
  requestId?: string;
  rateLimitKey?: string;
}

// =============================================================================
// CACHE IMPLEMENTATION
// =============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.createdAt - b.createdAt)[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// =============================================================================
// UNIFIED BACKEND CLIENT
// =============================================================================

export class BackendClient {
  private supabase: SupabaseClient<Database>;
  private cache: ResponseCache;
  private config: Required<BackendClientConfig>;

  constructor(config: BackendClientConfig) {
    this.config = {
      ...config,
      rateLimitConfig: {
        maxRequests: 100,
        windowMs: 60_000,
        ...config.rateLimitConfig,
      },
      cacheConfig: {
        defaultTtlMs: 5 * 60 * 1000, // 5 minutes
        maxCacheSize: 1000,
        ...config.cacheConfig,
      },
    };

    this.supabase = createClient<Database>(
      this.config.supabaseUrl,
      this.config.supabaseKey,
      {
        auth: {
          persistSession: false, // Serverless environment
        },
        db: {
          schema: 'public',
        },
      }
    );

    this.cache = new ResponseCache(this.config.cacheConfig.maxCacheSize);
  }

  // =============================================================================
  // RATE LIMITING & DEDUPLICATION
  // =============================================================================

  private checkRateLimit(options: BackendClientOptions): void {
    const key = options.rateLimitKey || options.userId || 'anonymous';
    const rateLimit = rateLimiter.check(
      `backend:${key}`,
      this.config.rateLimitConfig.maxRequests,
      this.config.rateLimitConfig.windowMs
    );

    if (!rateLimit.allowed) {
      throw new AppError('RATE_LIMITED', 'Too many requests', {
        retryAfter: rateLimit.retryAfter,
      });
    }
  }

  private async withDeduplication<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 5000
  ): Promise<T> {
    return deduplicator.deduplicate(key, fn, ttlMs);
  }

  private getCacheKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${operation}|${sortedParams}`;
  }

  // =============================================================================
  // PLAYLIST OPERATIONS
  // =============================================================================

  async createPlaylist(
    request: CreatePlaylistRequest,
    options: BackendClientOptions = {}
  ): Promise<PlaylistDTO> {
    this.checkRateLimit(options);

    if (!options.userId) {
      throw new AppError('UNAUTHORIZED', 'User ID required for playlist creation');
    }

    try {
      const { data, error } = await this.supabase
        .from('playlists')
        .insert({
          name: request.name,
          description: request.description || null,
          user_id: options.userId,
          genre: request.genre || null,
          energy_level: request.energy_level || null,
        })
        .select()
        .single();

      if (error) {
        throw new AppError('DATABASE_ERROR', `Failed to create playlist: ${error.message}`);
      }

      // Invalidate user's playlist cache
      this.cache.invalidatePattern(`playlists:user:${options.userId}`);

      const dto = playlistToDTO(data);
      return { ...dto, tracks: [] };
    } catch (error) {
      throw normalizeError(error, {
        code: 'PLAYLIST_CREATE_ERROR',
        message: 'Failed to create playlist',
      });
    }
  }

  async getPlaylist(
    playlistId: string,
    options: BackendClientOptions = {}
  ): Promise<PlaylistDTO | null> {
    this.checkRateLimit(options);

    const cacheKey = this.getCacheKey('playlist', { id: playlistId });
    const cached = this.cache.get<PlaylistDTO>(cacheKey);
    if (cached) return cached;

    return this.withDeduplication(
      `getPlaylist:${playlistId}`,
      async () => {
        try {
          // Get playlist with tracks in a single query
          const { data: playlist, error: playlistError } = await this.supabase
            .from('playlists')
            .select(`
              *,
              tracks (*)
            `)
            .eq('id', playlistId)
            .single();

          if (playlistError) {
            if (playlistError.code === 'PGRST116') return null; // Not found
            throw new AppError('DATABASE_ERROR', `Failed to get playlist: ${playlistError.message}`);
          }

          // Convert to DTO
          const playlistDto = playlistToDTO(playlist);
          const tracksDto = (playlist.tracks || [])
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map(trackToDTO);

          const result: PlaylistDTO = {
            ...playlistDto,
            tracks: tracksDto,
          };

          // Cache the result
          this.cache.set(cacheKey, result, this.config.cacheConfig.defaultTtlMs);
          return result;
        } catch (error) {
          throw normalizeError(error, {
            code: 'PLAYLIST_GET_ERROR',
            message: 'Failed to get playlist',
          });
        }
      }
    );
  }

  async getUserPlaylists(
    userId: string,
    options: BackendClientOptions = {}
  ): Promise<PlaylistDTO[]> {
    this.checkRateLimit(options);

    const cacheKey = this.getCacheKey('playlists', { user: userId });
    const cached = this.cache.get<PlaylistDTO[]>(cacheKey);
    if (cached) return cached;

    return this.withDeduplication(
      `getUserPlaylists:${userId}`,
      async () => {
        try {
          const { data: playlists, error } = await this.supabase
            .from('playlists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            throw new AppError('DATABASE_ERROR', `Failed to get playlists: ${error.message}`);
          }

          const result = playlists.map(playlist => ({
            ...playlistToDTO(playlist),
            tracks: [], // Don't load tracks for list view
          }));

          this.cache.set(cacheKey, result, this.config.cacheConfig.defaultTtlMs);
          return result;
        } catch (error) {
          throw normalizeError(error, {
            code: 'PLAYLISTS_GET_ERROR',
            message: 'Failed to get user playlists',
          });
        }
      }
    );
  }

  async updatePlaylist(
    playlistId: string,
    request: UpdatePlaylistRequest,
    options: BackendClientOptions = {}
  ): Promise<PlaylistDTO> {
    this.checkRateLimit(options);

    if (!options.userId) {
      throw new AppError('UNAUTHORIZED', 'User ID required for playlist update');
    }

    try {
      const { data, error } = await this.supabase
        .from('playlists')
        .update({
          ...(request.name && { name: request.name }),
          ...(request.description !== undefined && { description: request.description }),
          ...(request.genre && { genre: request.genre }),
          ...(request.energy_level && { energy_level: request.energy_level }),
        })
        .eq('id', playlistId)
        .eq('user_id', options.userId) // Ensure user owns the playlist
        .select()
        .single();

      if (error) {
        throw new AppError('DATABASE_ERROR', `Failed to update playlist: ${error.message}`);
      }

      // Invalidate caches
      this.cache.delete(this.getCacheKey('playlist', { id: playlistId }));
      this.cache.invalidatePattern(`playlists:user:${options.userId}`);

      const dto = playlistToDTO(data);
      return { ...dto, tracks: [] };
    } catch (error) {
      throw normalizeError(error, {
        code: 'PLAYLIST_UPDATE_ERROR',
        message: 'Failed to update playlist',
      });
    }
  }

  async deletePlaylist(
    playlistId: string,
    options: BackendClientOptions = {}
  ): Promise<void> {
    this.checkRateLimit(options);

    if (!options.userId) {
      throw new AppError('UNAUTHORIZED', 'User ID required for playlist deletion');
    }

    try {
      const { error } = await this.supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', options.userId);

      if (error) {
        throw new AppError('DATABASE_ERROR', `Failed to delete playlist: ${error.message}`);
      }

      // Invalidate caches
      this.cache.delete(this.getCacheKey('playlist', { id: playlistId }));
      this.cache.invalidatePattern(`playlists:user:${options.userId}`);
    } catch (error) {
      throw normalizeError(error, {
        code: 'PLAYLIST_DELETE_ERROR',
        message: 'Failed to delete playlist',
      });
    }
  }

  // =============================================================================
  // TRACK OPERATIONS
  // =============================================================================

  async addTrackToPlaylist(
    playlistId: string,
    request: AddTrackRequest,
    options: BackendClientOptions = {}
  ): Promise<TrackDTO> {
    this.checkRateLimit(options);

    try {
      // Get next position
      const { data: lastTrack } = await this.supabase
        .from('tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      const position = request.position || ((lastTrack?.position || 0) + 1);

      const { data, error } = await this.supabase
        .from('tracks')
        .insert({
          playlist_id: playlistId,
          title: request.title,
          artist: request.artist,
          album: request.album || null,
          duration: request.duration || null,
          bpm: request.bpm || null,
          energy: request.energy || null,
          key: request.key || null,
          genre: request.genre || null,
          energy_level: request.energy_level || null,
          position,
          spotify_id: request.spotify_id || null,
          youtube_id: request.youtube_id || null,
          youtube_url: request.youtube_url || null,
          preview_url: request.preview_url || null,
          thumbnail: request.thumbnail || null,
        })
        .select()
        .single();

      if (error) {
        throw new AppError('DATABASE_ERROR', `Failed to add track: ${error.message}`);
      }

      // Invalidate playlist cache
      this.cache.delete(this.getCacheKey('playlist', { id: playlistId }));

      return trackToDTO(data);
    } catch (error) {
      throw normalizeError(error, {
        code: 'TRACK_ADD_ERROR',
        message: 'Failed to add track to playlist',
      });
    }
  }

  async removeTrackFromPlaylist(
    trackId: string,
    options: BackendClientOptions = {}
  ): Promise<void> {
    this.checkRateLimit(options);

    try {
      // Get track info before deletion for cache invalidation
      const { data: track } = await this.supabase
        .from('tracks')
        .select('playlist_id')
        .eq('id', trackId)
        .single();

      const { error } = await this.supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) {
        throw new AppError('DATABASE_ERROR', `Failed to remove track: ${error.message}`);
      }

      // Invalidate playlist cache
      if (track?.playlist_id) {
        this.cache.delete(this.getCacheKey('playlist', { id: track.playlist_id }));
      }
    } catch (error) {
      throw normalizeError(error, {
        code: 'TRACK_REMOVE_ERROR',
        message: 'Failed to remove track from playlist',
      });
    }
  }

  // =============================================================================
  // SESSION OPERATIONS
  // =============================================================================

  async createSession(
    request: CreateSessionRequest,
    options: BackendClientOptions = {}
  ): Promise<SessionDTO> {
    this.checkRateLimit(options);

    if (!options.userId) {
      throw new AppError('UNAUTHORIZED', 'User ID required for session creation');
    }

    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .insert({
          user_id: options.userId,
          playlist_id: request.playlist_id || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw new AppError('DATABASE_ERROR', `Failed to create session: ${error.message}`);
      }

      return sessionToDTO(data);
    } catch (error) {
      throw normalizeError(error, {
        code: 'SESSION_CREATE_ERROR',
        message: 'Failed to create session',
      });
    }
  }

  async updateSession(
    sessionId: string,
    request: UpdateSessionRequest,
    options: BackendClientOptions = {}
  ): Promise<SessionDTO> {
    this.checkRateLimit(options);

    if (!options.userId) {
      throw new AppError('UNAUTHORIZED', 'User ID required for session update');
    }

    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .update({
          ...(request.status && { status: request.status }),
          ...(request.playlist_id !== undefined && { playlist_id: request.playlist_id }),
          ...(request.ended_at && { ended_at: request.ended_at }),
        })
        .eq('id', sessionId)
        .eq('user_id', options.userId)
        .select()
        .single();

      if (error) {
        throw new AppError('DATABASE_ERROR', `Failed to update session: ${error.message}`);
      }

      return sessionToDTO(data);
    } catch (error) {
      throw normalizeError(error, {
        code: 'SESSION_UPDATE_ERROR',
        message: 'Failed to update session',
      });
    }
  }

  async getUserSessions(
    userId: string,
    options: BackendClientOptions = {}
  ): Promise<SessionDTO[]> {
    this.checkRateLimit(options);

    const cacheKey = this.getCacheKey('sessions', { user: userId });
    const cached = this.cache.get<SessionDTO[]>(cacheKey);
    if (cached) return cached;

    return this.withDeduplication(
      `getUserSessions:${userId}`,
      async () => {
        try {
          const { data, error } = await this.supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            throw new AppError('DATABASE_ERROR', `Failed to get sessions: ${error.message}`);
          }

          const result = data.map(sessionToDTO);
          this.cache.set(cacheKey, result, this.config.cacheConfig.defaultTtlMs);
          return result;
        } catch (error) {
          throw normalizeError(error, {
            code: 'SESSIONS_GET_ERROR',
            message: 'Failed to get user sessions',
          });
        }
      }
    );
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  clearCache(): void {
    this.cache.clear();
  }

  invalidateUserCache(userId: string): void {
    this.cache.invalidatePattern(`.*:user:${userId}`);
  }

  invalidatePlaylistCache(playlistId: string): void {
    this.cache.delete(this.getCacheKey('playlist', { id: playlistId }));
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createBackendClient(config: BackendClientConfig): BackendClient {
  return new BackendClient(config);
}

// =============================================================================
// DEFAULT INSTANCE (for environments with fixed config)
// =============================================================================

let defaultClient: BackendClient | null = null;

export function getDefaultBackendClient(): BackendClient {
  if (!defaultClient) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new AppError('MISSING_CONFIG', 'Supabase URL and key are required');
    }

    defaultClient = createBackendClient({
      supabaseUrl,
      supabaseKey,
    });
  }

  return defaultClient;
}