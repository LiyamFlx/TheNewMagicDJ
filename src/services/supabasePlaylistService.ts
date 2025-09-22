// Supabase playlist service - Improved version
import { supabase, getCurrentUserId } from '../lib/supabase';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// Types for better type safety
interface Track {
  id?: string;
  title: string;
  artist: string;
  bpm?: number;
  energy?: number;
  duration?: number;
  url?: string;
  source_url?: string;
  // Optional metadata commonly present from generators/providers
  key?: string;
  genre?: string;
  position?: number;
  spotify_id?: string | null;
  youtube_id?: string | null;
  preview_url?: string | null;
  thumbnail?: string | null;
}

interface Playlist {
  id?: string;
  name: string;
  user_id?: string;
  description?: string;
  tracks?: Track[];
  created_at?: string;
  updated_at?: string;
}

interface CacheEntry {
  data: any;
  expiry: number;
}

// Enhanced cache management
class PlaylistCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 15_000; // 15 seconds

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { 
      data, 
      expiry: Date.now() + this.TTL_MS 
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Bust all playlist caches for a user
  bustUserCache(userId: string): void {
    const userKey = this.getUserPlaylistsKey(userId);
    this.delete(userKey);
  }

  // Bust all playlist caches (when we don't know the user)
  bustAllPlaylistCaches(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('playlists:')) {
        this.cache.delete(key);
      }
    }
  }

  private getUserPlaylistsKey(userId: string): string {
    return `playlists:${userId}`;
  }
}

const cache = new PlaylistCache();

// Authentication helper
class AuthHelper {
  static async checkAuthentication(retries = 3): Promise<{ isAuthenticated: boolean; session: any }> {
    for (let i = 0; i < retries; i++) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        const isAuthenticated = !!(session?.access_token && session?.user);

        // If auth is ready or this is the last retry, return the result
        if (isAuthenticated || i === retries - 1) {
          return { isAuthenticated, session };
        }

        // Wait before retrying if authentication is not ready
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error('supabasePlaylistService', 'Authentication check failed', error as any);
        if (i === retries - 1) {
          return { isAuthenticated: false, session: null };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { isAuthenticated: false, session: null };
  }

  static handleUnauthenticated(operation: string, fallbackValue: any = null) {
    logger.warn('supabasePlaylistService', `Supabase not authenticated; skipping ${operation}.`);
    return fallbackValue;
  }
}

// Data validation helpers
class ValidationHelper {
  static validatePlaylist(playlist: Partial<Playlist>): void {
    if (!playlist.name || !playlist.name.trim()) {
      throw new AppError('BAD_REQUEST', 'Playlist name is required');
    }
  }

  static validateUserId(userId: string): void {
    if (!userId) {
      throw new AppError('BAD_REQUEST', 'User ID is required');
    }
  }

  static sanitizeTrackData(tracks: Track[], playlistId: string) {
    return tracks
      .map(track => ({
        playlist_id: playlistId,
        title: track.title || 'Untitled',
        artist: track.artist || 'Unknown Artist',
        bpm: typeof track.bpm === 'number' ? Math.floor(track.bpm) : null,
        energy: typeof track.energy === 'number' ? Math.floor(track.energy) : null,
        duration: typeof track.duration === 'number' ? Math.floor(track.duration) : 180,
        key: (track as any).key || null,
        genre: (track as any).genre || null,
        position: typeof (track as any).position === 'number' ? (track as any).position : null,
        spotify_id: (track as any).spotify_id ?? null,
        youtube_id: (track as any).youtube_id ?? null,
        preview_url: (track as any).preview_url ?? null,
        thumbnail: (track as any).thumbnail ?? null,
        source_url: (track as any).source_url || track.url || (track as any).youtube_url || (track as any).preview_url || null,
      }))
      .filter(row => row.title);
  }
}

export const supabasePlaylistService = {
  async savePlaylist(playlist: Playlist, userId: string): Promise<Playlist> {
    try {
      ValidationHelper.validateUserId(userId);
      ValidationHelper.validatePlaylist(playlist);

      const { isAuthenticated } = await AuthHelper.checkAuthentication();
      
      if (!isAuthenticated) {
        return AuthHelper.handleUnauthenticated('remote save', { ...playlist });
      }

      // Sanity check: ensure caller userId matches current auth
      const authUserId = await getCurrentUserId();
      if (authUserId && authUserId !== userId) {
        logger.warn('supabasePlaylistService', 'Auth/userId mismatch detected during save', { authUserId, userId });
      }

      logger.info('supabasePlaylistService', 'Saving playlist', {
        playlistId: playlist.id,
        name: playlist.name,
        userId,
        trackCount: playlist.tracks?.length || 0,
      });

      const result = await this._savePlaylistToDatabase(playlist, userId);
      cache.bustUserCache(userId);
      
      return result;
    } catch (error) {
      logger.error('supabasePlaylistService', 'SavePlaylist error', error as any);
      throw error;
    }
  },

  async _savePlaylistToDatabase(playlist: Playlist, userId: string): Promise<Playlist> {
    const { id: playlistId, name, tracks = [] } = playlist;

    // Save playlist
    const playlistPayload = {
      id: playlistId || undefined,
      name: name.trim(),
      user_id: userId,
      description: playlist.description || null,
    };

    const { data: playlistData, error: playlistError } = await supabase
      .from('playlists')
      .upsert(playlistPayload)
      .select()
      .single();

    if (playlistError) {
      logger.error('supabasePlaylistService', 'Supabase playlist save error', playlistError as any);
      throw new AppError('UPSTREAM_ERROR', 'Failed to save playlist', {
        details: { playlistError },
      });
    }

    logger.info('supabasePlaylistService', 'Playlist saved', playlistData);

    // Save tracks if provided
    if (tracks.length > 0) {
      await this._saveTracksToDatabase(tracks, playlistData.id);
    }

    return { ...playlistData, tracks };
  },

  async _saveTracksToDatabase(tracks: Track[], playlistId: string): Promise<void> {
    const trackData = ValidationHelper.sanitizeTrackData(tracks, playlistId);

    if (trackData.length === 0) return;

    // Group tracks by available conflict keys for idempotent upserts
    const spotifyGroup = trackData.filter(t => t.spotify_id);
    const youtubeGroup = trackData.filter(t => !t.spotify_id && t.youtube_id);
    const positionGroup = trackData.filter(t => !t.spotify_id && !t.youtube_id && typeof t.position === 'number');
    const insertGroup = trackData.filter(t => !spotifyGroup.includes(t) && !youtubeGroup.includes(t) && !positionGroup.includes(t));

    let saved = 0;

    // Upsert by (playlist_id, spotify_id)
    if (spotifyGroup.length > 0) {
      const { error } = await supabase
        .from('tracks')
        .upsert(spotifyGroup);
      if (error) {
        logger.error('supabasePlaylistService', 'Tracks upsert error (spotify_id)', error as any);
      } else {
        saved += spotifyGroup.length;
      }
    }

    // Upsert by (playlist_id, youtube_id)
    if (youtubeGroup.length > 0) {
      const { error } = await supabase
        .from('tracks')
        .upsert(youtubeGroup);
      if (error) {
        logger.error('supabasePlaylistService', 'Tracks upsert error (youtube_id)', error as any);
      } else {
        saved += youtubeGroup.length;
      }
    }

    // Upsert by (playlist_id, position)
    if (positionGroup.length > 0) {
      const { error } = await supabase
        .from('tracks')
        .upsert(positionGroup);
      if (error) {
        logger.error('supabasePlaylistService', 'Tracks upsert error (position)', error as any);
      } else {
        saved += positionGroup.length;
      }
    }

    // Fallback insert for items without any conflict key
    if (insertGroup.length > 0) {
      const { error } = await supabase.from('tracks').insert(insertGroup);
      if (error) {
        logger.error('supabasePlaylistService', 'Tracks insert error (no conflict key)', error as any);
      } else {
        saved += insertGroup.length;
      }
    }

    logger.info('supabasePlaylistService', `Saved/Upserted ${saved} tracks (playlist ${playlistId})`);
  },

  async getPlaylists(userId: string): Promise<Playlist[]> {
    const cacheKey = `playlists:${userId}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      ValidationHelper.validateUserId(userId);

      // Wait a bit longer for authentication to be fully established
      await new Promise(resolve => setTimeout(resolve, 200));

      const { isAuthenticated, session } = await AuthHelper.checkAuthentication();
      const authUserId = await getCurrentUserId();

      logger.info('supabasePlaylistService', 'Auth check for playlists', {
        isAuthenticated,
        authUserId,
        requestedUserId: userId,
        sessionExists: !!session,
        sessionUserId: session?.user?.id
      });

      if (authUserId && authUserId !== userId) {
        logger.warn('supabasePlaylistService', 'Auth/userId mismatch detected during fetch', { authUserId, userId });
      }

      if (!isAuthenticated || !session?.user) {
        const emptyResult = AuthHelper.handleUnauthenticated('playlist fetch', []);
        cache.set(cacheKey, emptyResult);
        return emptyResult;
      }

      // Ensure the session user ID matches the requested user ID
      if (session.user.id !== userId) {
        logger.error('supabasePlaylistService', 'Session user ID mismatch', {
          sessionUserId: session.user.id,
          requestedUserId: userId
        });
        throw new AppError('UNAUTHORIZED', 'Authentication mismatch - please sign in again');
      }

      const playlists = await this._fetchPlaylistsFromDatabase(userId);
      cache.set(cacheKey, playlists);

      return playlists;
    } catch (error) {
      logger.error('supabasePlaylistService', 'Supabase getPlaylists error', error as any);
      throw new AppError('UPSTREAM_ERROR', 'Failed to fetch playlists', {
        details: { error },
      });
    }
  },

  async _fetchPlaylistsFromDatabase(userId: string): Promise<Playlist[]> {
    // Fetch playlists
    const { data: playlists, error: playlistError } = await supabase
      .from('playlists')
      .select('id, user_id, name, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (playlistError) {
      logger.error('supabasePlaylistService', 'Supabase playlist query error', playlistError as any);

      // Provide more specific error messages for common auth issues
      if (playlistError.code === '42501' ||
          playlistError.message?.includes('permission denied') ||
          playlistError.message?.includes('Row Level Security') ||
          playlistError.code === 'PGRST301') {

        // Log additional context for debugging
        logger.error('supabasePlaylistService', 'RLS/Auth error details', {
          errorCode: playlistError.code,
          errorMessage: playlistError.message,
          userId,
        });

        throw new AppError('UNAUTHORIZED', 'Access denied: Your session may have expired. Please sign out and sign in again.', {
          details: { playlistError },
        });
      }

      throw new AppError('UPSTREAM_ERROR', 'Failed to fetch playlists', {
        details: { playlistError },
      });
    }

    if (!playlists || playlists.length === 0) {
      return [];
    }

    // Fetch tracks for all playlists
    const tracks = await this._fetchTracksForPlaylists(playlists.map(p => p.id));
    
    // Combine playlists with tracks
    return this._combinePlaylistsWithTracks(playlists, tracks);
  },

  async _fetchTracksForPlaylists(playlistIds: string[]): Promise<Track[]> {
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, playlist_id, title, artist, bpm, energy, duration')
      .in('playlist_id', playlistIds)
      .order('created_at', { ascending: true });

    if (tracksError) {
      logger.error('supabasePlaylistService', 'Supabase tracks query error', tracksError as any);
      return []; // Return empty array rather than failing
    }

    return tracks || [];
  },

  _combinePlaylistsWithTracks(playlists: any[], tracks: Track[]): Playlist[] {
    // Group tracks by playlist ID
    const tracksByPlaylist = tracks.reduce((acc: Record<string, Track[]>, track: any) => {
      if (!acc[track.playlist_id]) {
        acc[track.playlist_id] = [];
      }
      
      acc[track.playlist_id].push({
        id: track.id,
        title: track.title,
        artist: track.artist,
        bpm: track.bpm ?? undefined,
        energy: typeof track.energy === 'number' ? Number(track.energy) : undefined,
        duration: track.duration ?? 180,
      });
      
      return acc;
    }, {});

    // Combine playlists with their tracks
    return playlists.map(playlist => ({
      ...playlist,
      tracks: tracksByPlaylist[playlist.id] || [],
    }));
  },

  async createPlaylist(userId: string, name: string): Promise<Playlist> {
    try {
      ValidationHelper.validateUserId(userId);
      
      if (!name || !name.trim()) {
        throw new AppError('BAD_REQUEST', 'Playlist name is required');
      }

      const { isAuthenticated } = await AuthHelper.checkAuthentication();
      
      if (!isAuthenticated) {
        return AuthHelper.handleUnauthenticated('remote create', {
          id: `local-${Date.now()}`,
          user_id: userId,
          name: name.trim(),
          created_at: new Date().toISOString(),
          tracks: [],
        });
      }

      const authUserId = await getCurrentUserId();
      if (authUserId && authUserId !== userId) {
        logger.warn('supabasePlaylistService', 'Auth/userId mismatch detected during create', { authUserId, userId });
      }

      const { data, error } = await supabase
        .from('playlists')
        .insert([{ user_id: userId, name: name.trim() }])
        .select()
        .single();

      if (error) {
        throw new AppError('UPSTREAM_ERROR', 'Failed to create playlist', {
          details: { error },
        });
      }

      cache.bustUserCache(userId);
      return { ...data, tracks: [] };
    } catch (error) {
      logger.error('supabasePlaylistService', 'Create playlist error', error as any);
      throw error;
    }
  },

  async deletePlaylist(playlistId: string, userId?: string): Promise<boolean> {
    try {
      if (!playlistId) {
        throw new AppError('BAD_REQUEST', 'Playlist ID is required');
      }

      const { isAuthenticated } = await AuthHelper.checkAuthentication();
      
      if (!isAuthenticated) {
        return AuthHelper.handleUnauthenticated('remote delete', false);
      }

      const query = supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      // Scope delete to owner if userId provided (defense-in-depth with RLS)
      const { error } = userId ? await query.eq('user_id', userId) : await query;

      if (error) {
        throw new AppError('UPSTREAM_ERROR', 'Failed to delete playlist', {
          details: { error },
        });
      }

      // Efficient cache busting
      if (userId) {
        cache.bustUserCache(userId);
      } else {
        cache.bustAllPlaylistCaches();
      }

      return true;
    } catch (error) {
      logger.error('supabasePlaylistService', 'Delete playlist error', error as any);
      throw error;
    }
  },

  // Utility methods
  async updatePlaylist(playlistId: string, updates: Partial<Playlist>, userId: string): Promise<Playlist> {
    try {
      ValidationHelper.validateUserId(userId);
      
      if (!playlistId) {
        throw new AppError('BAD_REQUEST', 'Playlist ID is required');
      }

      const { isAuthenticated } = await AuthHelper.checkAuthentication();
      
      if (!isAuthenticated) {
        throw new AppError('UNAUTHORIZED', 'Authentication required for playlist updates');
      }

      const { data, error } = await supabase
        .from('playlists')
        .update({
          name: updates.name?.trim(),
          description: updates.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', playlistId)
        .eq('user_id', userId) // Ensure user owns the playlist
        .select()
        .single();

      if (error) {
        throw new AppError('UPSTREAM_ERROR', 'Failed to update playlist', {
          details: { error },
        });
      }

      cache.bustUserCache(userId);
      return data;
    } catch (error) {
      logger.error('supabasePlaylistService', 'Update playlist error', error as any);
      throw error;
    }
  },

  // Clear all caches (useful for logout)
  clearCache(): void {
    cache.bustAllPlaylistCaches();
  },
};
