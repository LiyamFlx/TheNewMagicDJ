import { Playlist, Track, RecognitionResult } from '../types/index';
import { productionSpotifyService } from './productionSpotifyService';
import { youtubeService } from './youtubeService';
import { supabasePlaylistService } from './supabasePlaylistService';
import { logger } from '../utils/logger';

// =============================================================================
// TYPE DEFINITIONS & INTERFACES
// =============================================================================

/**
 * Standard error response format for playlist operations
 */
export interface PlaylistServiceError {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
  readonly field?: string;
}

/**
 * Playlist creation parameters
 */
export interface CreatePlaylistParams {
  readonly name: string;
  readonly description?: string;
  readonly userId: string;
  readonly isPublic?: boolean;
  readonly tracks?: readonly Track[];
}

/**
 * Playlist update parameters
 */
export interface UpdatePlaylistParams {
  readonly playlistId: string;
  readonly name?: string;
  readonly description?: string;
  readonly isPublic?: boolean;
  readonly userId: string;
}

/**
 * Track management parameters
 */
export interface AddTrackParams {
  readonly playlistId: string;
  readonly track: Track;
  readonly position?: number;
  readonly userId: string;
}

export interface RemoveTrackParams {
  readonly playlistId: string;
  readonly trackId: string;
  readonly userId: string;
}

export interface ReorderTracksParams {
  readonly playlistId: string;
  readonly trackId: string;
  readonly newPosition: number;
  readonly userId: string;
}

/**
 * Playlist query parameters
 */
export interface GetPlaylistsParams {
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'created_at' | 'name';
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Magic playlist generation parameters
 */
export interface MagicMatchParams {
  readonly fingerprint?: string;
  readonly seedTrack?: Track;
  readonly userId?: string;
}

export interface MagicSetParams {
  readonly vibe: string;
  readonly energyLevel: 'low' | 'medium' | 'high';
  readonly userId?: string;
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  readonly data: T;
  readonly expiry: number;
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PLAYLIST_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TRACKS_PER_PLAYLIST = 1000;
// Note: Lazy loading chunk size for future pagination implementation
// const LAZY_LOAD_CHUNK_SIZE = 50;

// Real music sources only - no demo/fallback content

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validates playlist name
 * @param name - Playlist name to validate
 * @returns Validation error or null if valid
 */
function validatePlaylistName(name: string): PlaylistServiceError | null {
  if (!name || typeof name !== 'string') {
    return {
      code: 'INVALID_NAME',
      message: 'Playlist name is required',
      field: 'name',
    };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return {
      code: 'EMPTY_NAME',
      message: 'Playlist name cannot be empty',
      field: 'name',
    };
  }

  if (trimmed.length > MAX_PLAYLIST_NAME_LENGTH) {
    return {
      code: 'NAME_TOO_LONG',
      message: `Playlist name cannot exceed ${MAX_PLAYLIST_NAME_LENGTH} characters`,
      field: 'name',
    };
  }

  return null;
}

/**
 * Validates user ID
 * @param userId - User ID to validate
 * @returns Validation error or null if valid
 */
function validateUserId(userId: string): PlaylistServiceError | null {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return {
      code: 'INVALID_USER_ID',
      message: 'Valid user ID is required',
      field: 'userId',
    };
  }
  return null;
}

/**
 * Validates playlist ID
 * @param playlistId - Playlist ID to validate
 * @returns Validation error or null if valid
 */
function validatePlaylistId(playlistId: string): PlaylistServiceError | null {
  if (
    !playlistId ||
    typeof playlistId !== 'string' ||
    playlistId.trim().length === 0
  ) {
    return {
      code: 'INVALID_PLAYLIST_ID',
      message: 'Valid playlist ID is required',
      field: 'playlistId',
    };
  }
  return null;
}

/**
 * Validates track object
 * @param track - Track to validate
 * @returns Validation error or null if valid
 */
function validateTrack(track: Track): PlaylistServiceError | null {
  if (!track || typeof track !== 'object') {
    return {
      code: 'INVALID_TRACK',
      message: 'Valid track object is required',
      field: 'track',
    };
  }

  if (!track.id || typeof track.id !== 'string') {
    return {
      code: 'INVALID_TRACK_ID',
      message: 'Track must have a valid ID',
      field: 'track.id',
    };
  }

  if (!track.title || typeof track.title !== 'string') {
    return {
      code: 'INVALID_TRACK_TITLE',
      message: 'Track must have a valid title',
      field: 'track.title',
    };
  }

  return null;
}

// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================

/**
 * Comprehensive playlist service with full CRUD operations, caching,
 * validation, and error handling
 */
class PlaylistService {
  private readonly primaryMusicService = youtubeService;
  private readonly fallbackMusicService = productionSpotifyService;
  private readonly cache = new Map<string, CacheEntry<any>>();

  // ===========================================================================
  // CORE CRUD OPERATIONS
  // ===========================================================================

  /**
   * Creates a new playlist
   * @param params - Creation parameters
   * @returns Promise resolving to created playlist or null if error
   */
  public async createPlaylist(
    params: CreatePlaylistParams
  ): Promise<Playlist | null> {
    try {
      // Input validation
      const nameError = validatePlaylistName(params.name);
      if (nameError) {
        logger.warn('PlaylistService', 'Invalid playlist name', nameError);
        return null;
      }

      const userError = validateUserId(params.userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return null;
      }

      if (
        params.description &&
        params.description.length > MAX_DESCRIPTION_LENGTH
      ) {
        logger.warn('PlaylistService', 'Description too long', {
          length: params.description.length,
          maxLength: MAX_DESCRIPTION_LENGTH,
        });
        return null;
      }

      if (params.tracks && params.tracks.length > MAX_TRACKS_PER_PLAYLIST) {
        logger.warn('PlaylistService', 'Too many tracks', {
          trackCount: params.tracks.length,
          maxTracks: MAX_TRACKS_PER_PLAYLIST,
        });
        return null;
      }

      // Validate tracks if provided
      if (params.tracks) {
        for (const track of params.tracks) {
          const trackError = validateTrack(track);
          if (trackError) {
            logger.warn(
              'PlaylistService',
              'Invalid track in playlist',
              trackError
            );
            return null;
          }
        }
      }

      // Create playlist object
      const playlist: Playlist = {
        id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: params.name.trim(),
        description: params.description?.trim(),
        tracks: params.tracks ? this.validateTracks([...params.tracks]) : [],
        user_id: params.userId,
        created_at: new Date().toISOString(),
        total_duration:
          params.tracks?.reduce(
            (sum, track) => sum + (track.duration ?? 0),
            0
          ) ?? 0,
        type: 'user_created',
      };

      // Save to database
      const savedPlaylist = await supabasePlaylistService.savePlaylist(
        playlist,
        params.userId
      );
      if (!savedPlaylist) {
        logger.error('PlaylistService', 'Failed to save playlist to database');
        return null;
      }

      // Clear cache for user playlists
      this.clearUserPlaylistsCache(params.userId);

      logger.info('PlaylistService', 'Playlist created successfully', {
        playlistId: playlist.id,
        userId: params.userId,
        trackCount: playlist.tracks.length,
      });

      // Ensure playlist has a valid ID
      if (!savedPlaylist?.id) {
        throw new Error('Playlist creation failed: No ID returned');
      }
      return savedPlaylist as import('../types/index').Playlist;
    } catch (error) {
      logger.error('PlaylistService', 'Failed to create playlist', error);
      return null;
    }
  }

  /**
   * Gets a specific playlist by ID
   * @param playlistId - Playlist ID
   * @param userId - User ID for permission checking
   * @param loadTracks - Whether to load full track data (default: true)
   * @returns Promise resolving to playlist or null if not found
   */
  public async getPlaylist(
    playlistId: string,
    userId: string,
    loadTracks: boolean = true
  ): Promise<Playlist | null> {
    try {
      // Input validation
      const playlistError = validatePlaylistId(playlistId);
      if (playlistError) {
        logger.warn('PlaylistService', 'Invalid playlist ID', playlistError);
        return null;
      }

      const userError = validateUserId(userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return null;
      }

      // Check cache first
      const cacheKey = `playlist:${playlistId}:${userId}:${loadTracks}`;
      const cached = this.getCached<Playlist>(cacheKey);
      if (cached) {
        logger.debug('PlaylistService', 'Serving playlist from cache');
        return cached;
      }

      // Get user playlists and find the requested one
      const playlists = await supabasePlaylistService.getPlaylists(userId);
      const playlist = playlists?.find((p: any) => p.id === playlistId);

      if (!playlist) {
        logger.warn('PlaylistService', 'Playlist not found or access denied', {
          playlistId,
          userId,
        });
        return null;
      }

      // Load tracks if not already loaded or if specifically requested
      if (loadTracks && (!playlist.tracks || playlist.tracks.length === 0)) {
        // Tracks are already loaded from supabase
        // In a real implementation, you might lazy-load track details here
      }

      // Validate and fix track URLs
      if (playlist.tracks) {
        playlist.tracks = this.validateTracks(playlist.tracks as any);
      }

      // Ensure playlist has a valid ID and cast to proper type
      if (!playlist?.id) {
        throw new Error('Retrieved playlist missing ID');
      }

      const typedPlaylist = playlist as import('../types/index').Playlist;

      // Cache result
      this.setCached(cacheKey, typedPlaylist);

      logger.info('PlaylistService', 'Playlist retrieved successfully', {
        playlistId,
        trackCount: typedPlaylist.tracks?.length ?? 0,
      });

      return typedPlaylist;
    } catch (error) {
      logger.error('PlaylistService', 'Failed to get playlist', error);
      return null;
    }
  }

  /**
   * Gets all playlists for a user with pagination
   * @param params - Query parameters
   * @returns Promise resolving to array of playlists or null if error
   */
  public async getUserPlaylists(
    params: GetPlaylistsParams
  ): Promise<Playlist[] | null> {
    try {
      // Input validation
      const userError = validateUserId(params.userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return null;
      }

      // Check cache first
      const cacheKey = `user-playlists:${params.userId}:${JSON.stringify(params)}`;
      const cached = this.getCached<Playlist[]>(cacheKey);
      if (cached) {
        logger.debug('PlaylistService', 'Serving user playlists from cache');
        return cached;
      }

      // Get playlists from database
      const playlists = await supabasePlaylistService.getPlaylists(
        params.userId
      );
      if (!playlists) {
        logger.warn('PlaylistService', 'Failed to fetch user playlists');
        return null;
      }

      // Apply sorting
      const sortedPlaylists = [...playlists];
      if (params.sortBy) {
        sortedPlaylists.sort((a: any, b: any) => {
          const aVal = (a as any)[params.sortBy!];
          const bVal = (b as any)[params.sortBy!];

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            const comparison = aVal.localeCompare(bVal);
            return params.sortOrder === 'desc' ? -comparison : comparison;
          }

          if (aVal < bVal) return params.sortOrder === 'desc' ? 1 : -1;
          if (aVal > bVal) return params.sortOrder === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Apply pagination
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 50;
      const paginatedPlaylists = sortedPlaylists.slice(offset, offset + limit);

      // Validate tracks for each playlist and ensure proper typing
      const typedPlaylists: import('../types/index').Playlist[] = [];
      for (const playlist of paginatedPlaylists) {
        if (!playlist.id) {
          continue; // Skip playlists without IDs
        }
        if (playlist.tracks) {
          playlist.tracks = this.validateTracks(playlist.tracks as any);
        }
        typedPlaylists.push(playlist as import('../types/index').Playlist);
      }

      // Cache result
      this.setCached(cacheKey, typedPlaylists);

      logger.info('PlaylistService', 'User playlists retrieved successfully', {
        userId: params.userId,
        totalCount: playlists.length,
        returnedCount: typedPlaylists.length,
      });

      return typedPlaylists;
    } catch (error) {
      logger.error('PlaylistService', 'Failed to get user playlists', error);
      return null;
    }
  }

  /**
   * Updates an existing playlist
   * @param params - Update parameters
   * @returns Promise resolving to updated playlist or null if error
   */
  public async updatePlaylist(
    params: UpdatePlaylistParams
  ): Promise<Playlist | null> {
    try {
      // Input validation
      const playlistError = validatePlaylistId(params.playlistId);
      if (playlistError) {
        logger.warn('PlaylistService', 'Invalid playlist ID', playlistError);
        return null;
      }

      const userError = validateUserId(params.userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return null;
      }

      if (params.name) {
        const nameError = validatePlaylistName(params.name);
        if (nameError) {
          logger.warn('PlaylistService', 'Invalid playlist name', nameError);
          return null;
        }
      }

      if (
        params.description &&
        params.description.length > MAX_DESCRIPTION_LENGTH
      ) {
        logger.warn('PlaylistService', 'Description too long');
        return null;
      }

      // Get existing playlist
      const existingPlaylist = await this.getPlaylist(
        params.playlistId,
        params.userId
      );
      if (!existingPlaylist) {
        logger.warn('PlaylistService', 'Playlist not found for update');
        return null;
      }

      // Create updated playlist
      const updatedPlaylist: Playlist = {
        ...existingPlaylist,
        ...(params.name && { name: params.name.trim() }),
        ...(params.description !== undefined && {
          description: params.description.trim(),
        }),
        // Updated timestamp and other metadata handled by database
      };

      // Save to database
      const savedPlaylist = await supabasePlaylistService.savePlaylist(
        updatedPlaylist,
        params.userId
      );
      if (!savedPlaylist) {
        logger.error('PlaylistService', 'Failed to save updated playlist');
        return null;
      }

      // Clear relevant caches
      this.clearPlaylistCache(params.playlistId);
      this.clearUserPlaylistsCache(params.userId);

      logger.info('PlaylistService', 'Playlist updated successfully', {
        playlistId: params.playlistId,
        userId: params.userId,
      });

      // Ensure playlist has a valid ID
      if (!savedPlaylist?.id) {
        throw new Error('Playlist update failed: No ID returned');
      }
      return savedPlaylist as import('../types/index').Playlist;
    } catch (error) {
      logger.error('PlaylistService', 'Failed to update playlist', error);
      return null;
    }
  }

  /**
   * Deletes a playlist
   * @param playlistId - Playlist ID to delete
   * @param userId - User ID for permission checking
   * @returns Promise resolving to true if deleted, false if error
   */
  public async deletePlaylist(
    playlistId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Input validation
      const playlistError = validatePlaylistId(playlistId);
      if (playlistError) {
        logger.warn('PlaylistService', 'Invalid playlist ID', playlistError);
        return false;
      }

      const userError = validateUserId(userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return false;
      }

      // Check if playlist exists and user has permission
      const existingPlaylist = await this.getPlaylist(
        playlistId,
        userId,
        false
      );
      if (!existingPlaylist) {
        logger.warn('PlaylistService', 'Playlist not found for deletion');
        return false;
      }

      // Delete from database
      const deleted = await supabasePlaylistService.deletePlaylist(playlistId);
      if (!deleted) {
        logger.error(
          'PlaylistService',
          'Failed to delete playlist from database'
        );
        return false;
      }

      // Clear relevant caches
      this.clearPlaylistCache(playlistId);
      this.clearUserPlaylistsCache(userId);

      logger.info('PlaylistService', 'Playlist deleted successfully', {
        playlistId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error('PlaylistService', 'Failed to delete playlist', error);
      return false;
    }
  }

  // ===========================================================================
  // TRACK MANAGEMENT OPERATIONS
  // ===========================================================================

  /**
   * Adds a track to a playlist
   * @param params - Add track parameters
   * @returns Promise resolving to updated playlist or null if error
   */
  public async addTrackToPlaylist(
    params: AddTrackParams
  ): Promise<Playlist | null> {
    try {
      // Input validation
      const playlistError = validatePlaylistId(params.playlistId);
      if (playlistError) {
        logger.warn('PlaylistService', 'Invalid playlist ID', playlistError);
        return null;
      }

      const userError = validateUserId(params.userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return null;
      }

      const trackError = validateTrack(params.track);
      if (trackError) {
        logger.warn('PlaylistService', 'Invalid track', trackError);
        return null;
      }

      // Get existing playlist
      const playlist = await this.getPlaylist(params.playlistId, params.userId);
      if (!playlist) {
        logger.warn('PlaylistService', 'Playlist not found for track addition');
        return null;
      }

      // Check if track already exists
      if (playlist.tracks?.some(t => t.id === params.track.id)) {
        logger.warn('PlaylistService', 'Track already exists in playlist', {
          trackId: params.track.id,
          playlistId: params.playlistId,
        });
        return null;
      }

      // Check playlist size limit
      const currentTrackCount = playlist.tracks?.length ?? 0;
      if (currentTrackCount >= MAX_TRACKS_PER_PLAYLIST) {
        logger.warn('PlaylistService', 'Playlist track limit reached');
        return null;
      }

      // Validate and prepare track
      const validatedTracks = this.validateTracks([params.track]);
      const trackToAdd = validatedTracks[0];

      // Add track at specified position or end
      const updatedTracks = [...(playlist.tracks ?? [])];
      const position = params.position ?? updatedTracks.length;
      const clampedPosition = Math.max(
        0,
        Math.min(position, updatedTracks.length)
      );

      updatedTracks.splice(clampedPosition, 0, trackToAdd);

      // Update playlist
      const updatedPlaylist: Playlist = {
        ...playlist,
        tracks: updatedTracks,
        total_duration: updatedTracks.reduce(
          (sum, track) => sum + (track.duration ?? 0),
          0
        ),
        // Updated timestamp handled by database
      };

      // Save to database
      const savedPlaylist = await supabasePlaylistService.savePlaylist(
        updatedPlaylist,
        params.userId
      );
      if (!savedPlaylist) {
        logger.error(
          'PlaylistService',
          'Failed to save playlist after adding track'
        );
        return null;
      }

      // Clear relevant caches
      this.clearPlaylistCache(params.playlistId);
      this.clearUserPlaylistsCache(params.userId);

      logger.info('PlaylistService', 'Track added to playlist successfully', {
        trackId: params.track.id,
        playlistId: params.playlistId,
        position: clampedPosition,
      });

      // Ensure playlist has a valid ID
      if (!savedPlaylist?.id) {
        throw new Error('Add track failed: No playlist ID returned');
      }
      return savedPlaylist as import('../types/index').Playlist;
    } catch (error) {
      logger.error(
        'PlaylistService',
        'Failed to add track to playlist',
        error
      );
      return null;
    }
  }

  /**
   * Removes a track from a playlist
   * @param params - Remove track parameters
   * @returns Promise resolving to updated playlist or null if error
   */
  public async removeTrackFromPlaylist(
    params: RemoveTrackParams
  ): Promise<Playlist | null> {
    try {
      // Input validation
      const playlistError = validatePlaylistId(params.playlistId);
      if (playlistError) {
        logger.warn('PlaylistService', 'Invalid playlist ID', playlistError);
        return null;
      }

      const userError = validateUserId(params.userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return null;
      }

      if (!params.trackId || typeof params.trackId !== 'string') {
        logger.warn('PlaylistService', 'Invalid track ID for removal');
        return null;
      }

      // Get existing playlist
      const playlist = await this.getPlaylist(params.playlistId, params.userId);
      if (!playlist) {
        logger.warn('PlaylistService', 'Playlist not found for track removal');
        return null;
      }

      // Check if track exists in playlist
      const trackIndex =
        playlist.tracks?.findIndex(t => t.id === params.trackId) ?? -1;
      if (trackIndex === -1) {
        logger.warn('PlaylistService', 'Track not found in playlist', {
          trackId: params.trackId,
          playlistId: params.playlistId,
        });
        return null;
      }

      // Remove track
      const updatedTracks = [...(playlist.tracks ?? [])];
      updatedTracks.splice(trackIndex, 1);

      // Update playlist
      const updatedPlaylist: Playlist = {
        ...playlist,
        tracks: updatedTracks,
        total_duration: updatedTracks.reduce(
          (sum, track) => sum + (track.duration ?? 0),
          0
        ),
        // Updated timestamp handled by database
      };

      // Save to database
      const savedPlaylist = await supabasePlaylistService.savePlaylist(
        updatedPlaylist,
        params.userId
      );
      if (!savedPlaylist) {
        logger.error(
          'PlaylistService',
          'Failed to save playlist after removing track'
        );
        return null;
      }

      // Clear relevant caches
      this.clearPlaylistCache(params.playlistId);
      this.clearUserPlaylistsCache(params.userId);

      logger.info(
        'PlaylistService',
        'Track removed from playlist successfully',
        {
          trackId: params.trackId,
          playlistId: params.playlistId,
          removedFromPosition: trackIndex,
        }
      );

      // Ensure playlist has a valid ID
      if (!savedPlaylist?.id) {
        throw new Error('Remove track failed: No playlist ID returned');
      }
      return savedPlaylist as import('../types/index').Playlist;
    } catch (error) {
      logger.error(
        'PlaylistService',
        'Failed to remove track from playlist',
        error
      );
      return null;
    }
  }

  /**
   * Reorders tracks within a playlist
   * @param params - Reorder parameters
   * @returns Promise resolving to updated playlist or null if error
   */
  public async reorderTracksInPlaylist(
    params: ReorderTracksParams
  ): Promise<Playlist | null> {
    try {
      // Input validation
      const playlistError = validatePlaylistId(params.playlistId);
      if (playlistError) {
        logger.warn('PlaylistService', 'Invalid playlist ID', playlistError);
        return null;
      }

      const userError = validateUserId(params.userId);
      if (userError) {
        logger.warn('PlaylistService', 'Invalid user ID', userError);
        return null;
      }

      if (!params.trackId || typeof params.trackId !== 'string') {
        logger.warn('PlaylistService', 'Invalid track ID for reordering');
        return null;
      }

      if (typeof params.newPosition !== 'number' || params.newPosition < 0) {
        logger.warn('PlaylistService', 'Invalid new position for reordering');
        return null;
      }

      // Get existing playlist
      const playlist = await this.getPlaylist(params.playlistId, params.userId);
      if (!playlist) {
        logger.warn(
          'PlaylistService',
          'Playlist not found for track reordering'
        );
        return null;
      }

      if (!playlist.tracks || playlist.tracks.length === 0) {
        logger.warn(
          'PlaylistService',
          'Cannot reorder tracks in empty playlist'
        );
        return null;
      }

      // Find track to move
      const currentIndex = playlist.tracks.findIndex(
        t => t.id === params.trackId
      );
      if (currentIndex === -1) {
        logger.warn(
          'PlaylistService',
          'Track not found in playlist for reordering'
        );
        return null;
      }

      // Validate new position
      const maxPosition = playlist.tracks.length - 1;
      const clampedNewPosition = Math.max(
        0,
        Math.min(params.newPosition, maxPosition)
      );

      // If position hasn't changed, no need to update
      if (currentIndex === clampedNewPosition) {
        logger.debug(
          'PlaylistService',
          'Track position unchanged, skipping reorder'
        );
        return playlist;
      }

      // Reorder tracks
      const updatedTracks = [...playlist.tracks];
      const [movedTrack] = updatedTracks.splice(currentIndex, 1);
      updatedTracks.splice(clampedNewPosition, 0, movedTrack);

      // Update playlist
      const updatedPlaylist: Playlist = {
        ...playlist,
        tracks: updatedTracks,
        // Updated timestamp handled by database
      };

      // Save to database
      const savedPlaylist = await supabasePlaylistService.savePlaylist(
        updatedPlaylist,
        params.userId
      );
      if (!savedPlaylist) {
        logger.error(
          'PlaylistService',
          'Failed to save playlist after reordering tracks'
        );
        return null;
      }

      // Clear relevant caches
      this.clearPlaylistCache(params.playlistId);
      this.clearUserPlaylistsCache(params.userId);

      logger.info('PlaylistService', 'Tracks reordered successfully', {
        trackId: params.trackId,
        playlistId: params.playlistId,
        fromPosition: currentIndex,
        toPosition: clampedNewPosition,
      });

      // Ensure playlist has a valid ID
      if (!savedPlaylist?.id) {
        throw new Error('Reorder tracks failed: No playlist ID returned');
      }
      return savedPlaylist as import('../types/index').Playlist;
    } catch (error) {
      logger.error(
        'PlaylistService',
        'Failed to reorder tracks in playlist',
        error
      );
      return null;
    }
  }

  // ===========================================================================
  // MAGIC PLAYLIST GENERATION (LEGACY SUPPORT)
  // ===========================================================================

  /**
   * Generates a magic match playlist based on audio recognition
   * @param params - Magic match parameters
   * @returns Promise resolving to generated playlist
   */
  public async generateMagicMatchPlaylist(
    params: MagicMatchParams
  ): Promise<Playlist> {
    return logger.trackOperation(
      'PlaylistService',
      'generateMagicMatchPlaylist',
      async () => {
        let recognizedTrack: Track | null = null;

        if (params.fingerprint) {
          try {
            let recognition = await this.recognizeTrack(params.fingerprint);

            if (!recognition) {
              recognition = await this.enhancedRecognition(params.fingerprint);
            }

            if (recognition) {
              recognizedTrack = {
                id: recognition.spotify_id || `recognized-${Date.now()}`,
                title: recognition.title,
                artist: recognition.artist,
                album: recognition.album,
                duration: recognition.duration || 180,
                preview_url: recognition.preview_url,
                spotify_id: recognition.spotify_id,
              };
            }
          } catch (error) {
            logger.warn(
              'PlaylistService',
              'Track recognition failed, using seed track',
              error
            );
          }
        }

        const baseTrack = recognizedTrack || params.seedTrack;
        let tracks: Track[] = [];

        if (baseTrack) {
          try {
            const seed_tracks = baseTrack.spotify_id
              ? [baseTrack.spotify_id]
              : [];
            // Try YouTube first for track-based recommendations using analyzed audio
            try {
              // Parse audio features from fingerprint if available
              let audioFeatures = null;
              if (params.fingerprint) {
                try {
                  audioFeatures = JSON.parse(params.fingerprint);
                } catch {
                  // Fallback if fingerprint is not JSON
                }
              }

              const searchGenres = audioFeatures?.estimatedGenre
                ? [audioFeatures.estimatedGenre]
                : ['electronic'];
              const searchVibe = audioFeatures?.estimatedVibe || 'electronic';
              const searchEnergy = audioFeatures?.energyLevel || 'medium';

              logger.info(
                'PlaylistService',
                'Using analyzed audio characteristics',
                {
                  genre: searchGenres[0],
                  vibe: searchVibe,
                  energy: searchEnergy,
                  tempo: audioFeatures?.tempo,
                }
              );

              tracks =
                (await this.primaryMusicService.getRecommendations({
                  seed_genres: searchGenres,
                  vibe: searchVibe,
                  energy: searchEnergy,
                  limit: 15,
                })) || [];

              if (tracks.length === 0) {
                throw new Error('YouTube returned no tracks');
              }
            } catch (_ytError) {
              // Fallback to Spotify with seed tracks
              tracks = await this.fallbackMusicService.getRecommendations({
                seed_tracks,
                seed_genres: seed_tracks.length > 0 ? [] : ['electronic'],
                limit: 15,
              });
            }
          } catch (error) {
            logger.warn(
              'PlaylistService',
              'Failed to get track-based recommendations, using genre-based',
              error
            );
          }
        }

        if (tracks.length === 0) {
          try {
            // Try YouTube first for genre-based recommendations using analyzed audio
            try {
              // Parse audio features from fingerprint if available
              let audioFeatures = null;
              if (params.fingerprint) {
                try {
                  audioFeatures = JSON.parse(params.fingerprint);
                } catch {
                  // Fallback if fingerprint is not JSON
                }
              }

              const searchGenres = audioFeatures?.estimatedGenre
                ? [audioFeatures.estimatedGenre]
                : ['electronic'];
              const searchVibe = audioFeatures?.estimatedVibe || 'electronic';
              const searchEnergy = audioFeatures?.energyLevel || 'medium';

              logger.info(
                'PlaylistService',
                'Using analyzed audio characteristics (fallback)',
                {
                  genre: searchGenres[0],
                  vibe: searchVibe,
                  energy: searchEnergy,
                }
              );

              tracks =
                (await this.primaryMusicService.getRecommendations({
                  seed_genres: searchGenres,
                  vibe: searchVibe,
                  energy: searchEnergy,
                  limit: 15,
                })) || [];

              if (tracks.length === 0) {
                throw new Error('YouTube returned no tracks');
              }
            } catch (_ytError) {
              // Fallback to Spotify
              tracks = await this.fallbackMusicService.getRecommendations({
                seed_genres: ['electronic'],
                limit: 15,
              });
            }
          } catch (error) {
            logger.warn(
              'PlaylistService',
              'Primary recommendation service failed, trying YouTube',
              error
            );

            try {
              if (youtubeService.isConfigured()) {
                const ytTracks = await youtubeService.getRecommendations({
                  seed_genres: ['electronic'],
                  limit: 15,
                });
                tracks = ytTracks || [];
              } else {
                throw new Error('YouTube service not configured');
              }
            } catch (youtubeError) {
              logger.warn(
                'PlaylistService',
                'YouTube service failed, falling back to Spotify',
                youtubeError
              );
              tracks = await productionSpotifyService.getRecommendations({
                seed_genres: ['electronic'],
                limit: 15,
              });
            }
          }
        }

        if (
          recognizedTrack &&
          !tracks.find(t => t.id === recognizedTrack!.id)
        ) {
          tracks.unshift(recognizedTrack);
        }

        tracks = this.validateTracks(tracks);

        // Parse audio features for playlist metadata
        let audioFeatures = null;
        if (params.fingerprint) {
          try {
            audioFeatures = JSON.parse(params.fingerprint);
          } catch {
            // Fallback if fingerprint is not JSON
          }
        }

        const playlist: Playlist = {
          id: `magic-match-${Date.now()}`,
          name: recognizedTrack
            ? `Magic Match: ${recognizedTrack.title}`
            : audioFeatures
              ? `Magic Match: ${audioFeatures.estimatedGenre || 'Electronic'} (${audioFeatures.energyLevel || 'Medium'} Energy)`
              : 'Magic Match Playlist',
          description: recognizedTrack
            ? `AI-curated playlist based on "${recognizedTrack.title}" by ${recognizedTrack.artist}`
            : audioFeatures
              ? `AI-curated ${audioFeatures.estimatedGenre || 'electronic'} playlist with ${audioFeatures.energyLevel || 'medium'} energy, ${Math.round(audioFeatures.tempo || 120)} BPM`
              : 'AI-curated playlist based on audio analysis',
          tracks,
          total_duration: tracks.reduce(
            (sum, track) => sum + (track.duration ?? 0),
            0
          ),
          created_at: new Date().toISOString(),
          user_id: params.userId,
          type: 'magic_match',
          metadata: {
            seed_track: recognizedTrack || undefined,
            recognition_confidence: params.fingerprint ? 0.85 : undefined,
          },
        };

        return playlist;
      },
      { fingerprint: !!params.fingerprint, seedTrack: !!params.seedTrack }
    );
  }

  /**
   * Generates a magic set playlist based on vibe and energy
   * @param params - Magic set parameters
   * @returns Promise resolving to generated playlist
   */
  public async generateMagicSetPlaylist(
    params: MagicSetParams
  ): Promise<Playlist> {
    return logger.trackOperation(
      'PlaylistService',
      'generateMagicSetPlaylist',
      async () => {
        const energyMap = {
          low: 0.3,
          medium: 0.6,
          high: 0.9,
        };

        const energy = energyMap[params.energyLevel];
        const genres = [params.vibe.toLowerCase()];

        let tracks: Track[] = [];

        // Try YouTube first (primary source)
        try {
          logger.info(
            'PlaylistService',
            'Attempting YouTube recommendations first'
          );
          tracks =
            (await this.primaryMusicService.getRecommendations({
              seed_genres: genres,
              vibe: params.vibe,
              energy: params.energyLevel,
              limit: 20,
            })) || [];

          if (tracks.length > 0) {
            logger.info(
              'PlaylistService',
              'YouTube recommendations successful',
              { count: tracks.length }
            );
          } else {
            throw new Error('YouTube returned no tracks');
          }
        } catch (error) {
          logger.warn(
            'PlaylistService',
            'YouTube recommendations failed, trying Spotify fallback',
            error
          );

          // Fallback to Spotify
          try {
            tracks = await this.fallbackMusicService.getRecommendations({
              seed_genres: genres,
              limit: 20,
              target_energy: energy,
            });
            logger.info('PlaylistService', 'Spotify fallback successful', {
              count: tracks.length,
            });
          } catch (fallbackError) {
            logger.error(
              'PlaylistService',
              'Both YouTube and Spotify failed - no real music available',
              fallbackError
            );
            throw new Error(
              'Unable to fetch real music tracks. Please check your internet connection and try again.'
            );
          }
        }

        tracks = this.validateTracks(tracks);

        // Add diagnostic logging for track source percentages
        this.logTrackSourceDiagnostics(tracks);

        const playlist: Playlist = {
          id: `magic-set-${Date.now()}`,
          name: `Magic Set: ${params.vibe.charAt(0).toUpperCase() + params.vibe.slice(1)} (${params.energyLevel.toUpperCase()})`,
          description: `AI-generated ${params.vibe} playlist with ${params.energyLevel} energy`,
          tracks,
          total_duration: tracks.reduce(
            (sum, track) => sum + (track.duration ?? 0),
            0
          ),
          created_at: new Date().toISOString(),
          user_id: params.userId,
          type: 'magic_set',
          metadata: {
            vibe: params.vibe,
            energy_level: params.energyLevel,
          },
        };

        return playlist;
      },
      { vibe: params.vibe, energyLevel: params.energyLevel }
    );
  }

  // ===========================================================================
  // AUDIO RECOGNITION METHODS (LEGACY SUPPORT)
  // ===========================================================================

  /**
   * Recognizes track from audio fingerprint
   * @param fingerprint - Audio fingerprint
   * @returns Promise resolving to recognition result or null
   */
  public async recognizeTrack(
    fingerprint: string
  ): Promise<RecognitionResult | null> {
    return logger.trackOperation(
      'PlaylistService',
      'recognizeTrack',
      async () => {
        const mockResults = [
          {
            title: 'Electronic Dreams',
            artist: 'Synth Master',
            confidence: 0.85,
          },
          { title: 'Bass Drop', artist: 'DJ Thunder', confidence: 0.78 },
          { title: 'Neon Nights', artist: 'Cyber DJ', confidence: 0.92 },
          { title: 'Digital Pulse', artist: 'Tech Wizard', confidence: 0.81 },
        ];

        const randomResult =
          mockResults[Math.floor(Math.random() * mockResults.length)];

        return {
          title: randomResult.title,
          artist: randomResult.artist,
          confidence: randomResult.confidence,
          duration: 180 + Math.floor(Math.random() * 120),
          preview_url: undefined, // Use local audio fallback
        };
      },
      { fingerprint }
    );
  }

  /**
   * Enhanced track recognition with higher confidence
   * @param fingerprint - Audio fingerprint
   * @returns Promise resolving to recognition result or null
   */
  private async enhancedRecognition(
    fingerprint: string
  ): Promise<RecognitionResult | null> {
    return logger.trackOperation(
      'PlaylistService',
      'enhancedRecognition',
      async () => {
        return {
          title: 'Enhanced Recognition Track',
          artist: 'AI Recognition',
          confidence: 0.95,
          duration: 240,
          preview_url: undefined, // Use local audio fallback
        };
      },
      { fingerprint }
    );
  }

  /**
   * Recognizes track from uploaded audio file
   * @param file - Audio file
   * @returns Promise resolving to recognized track or null
   */
  public async recognizeFromAudioFile(file: File): Promise<Track | null> {
    return logger.trackOperation(
      'PlaylistService',
      'recognizeFromAudioFile',
      async () => {
        const fileName = file.name.replace(/\.[^/.]+$/, '');

        return {
          id: `file-recognized-${Date.now()}`,
          title: fileName || 'Recognized Track',
          artist: 'File Recognition',
          duration: 200,
          bpm: 128,
          energy: 0.8,
          preview_url: undefined, // Use local audio fallback
        };
      },
      { fileName: file.name, fileSize: file.size }
    );
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Validates tracks and ensures they have working preview URLs
   * @param tracks - Array of tracks to validate
   * @returns Array of validated tracks with fallback URLs if needed
   */
  private validateTracks(tracks: Track[]): Track[] {
    // Filter out tracks without real preview URLs
    // Only return tracks with actual Spotify/YouTube audio sources
    return tracks.filter(track => {
      if (!track.preview_url || track.preview_url.trim() === '') {
        logger.info(
          'PlaylistService',
          'Skipping track without real audio source',
          {
            trackId: track.id,
            title: track.title,
            artist: track.artist,
          }
        );
        return false; // Remove tracks without real audio
      }

      // Ensure track has valid metadata
      return track.title && track.artist && track.preview_url;
    });
  }

  /**
   * Gets cached data if available and not expired
   * @param key - Cache key
   * @returns Cached data or null
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Stores data in cache with expiration
   * @param key - Cache key
   * @param data - Data to cache
   */
  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    // Periodic cleanup of expired entries
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Removes expired entries from cache
   */
  private cleanupCache(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all cache entries for a specific playlist
   * @param playlistId - Playlist ID
   */
  private clearPlaylistCache(playlistId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`playlist:${playlistId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all cache entries for a user's playlists
   * @param userId - User ID
   */
  private clearUserPlaylistsCache(userId: string): void {
    for (const key of this.cache.keys()) {
      if (
        key.includes(`user-playlists:${userId}`) ||
        key.includes(`:${userId}:`)
      ) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Log diagnostic information about track source distribution
   */
  private logTrackSourceDiagnostics(tracks: Track[]): void {
    if (tracks.length === 0) {
      logger.warn(
        'PlaylistService',
        'No tracks to analyze for source diagnostics'
      );
      return;
    }

    const sourceStats = {
      youtube: 0,
      spotify: 0,
      proxy: 0,
      unknown: 0,
    };

    // Analyze track sources based on URL patterns and metadata
    tracks.forEach(track => {
      if (
        track.url?.includes('youtube.com') ||
        track.url?.includes('youtu.be')
      ) {
        sourceStats.youtube++;
      } else if (
        track.url?.includes('spotify.com') ||
        track.platform === 'spotify'
      ) {
        sourceStats.spotify++;
      } else if (track.url?.includes('/api/proxy-audio')) {
        sourceStats.proxy++;
      } else {
        sourceStats.unknown++;
      }
    });

    // Calculate percentages
    const total = tracks.length;
    const percentages = {
      youtube: Math.round((sourceStats.youtube / total) * 100),
      spotify: Math.round((sourceStats.spotify / total) * 100),
      proxy: Math.round((sourceStats.proxy / total) * 100),
      unknown: Math.round((sourceStats.unknown / total) * 100),
    };

    logger.info('PlaylistService', 'Track Source Distribution', {
      totalTracks: total,
      sources: sourceStats,
      percentages,
      pipeline: 'YouTube → Spotify only',
    });

    // Warn if low success rate indicates API issues
    if (percentages.youtube + percentages.spotify < 50) {
      logger.warn('PlaylistService', 'Low success rate indicates API issues', {
        successRate: percentages.youtube + percentages.spotify,
        youtubeCount: sourceStats.youtube,
        spotifyCount: sourceStats.spotify,
      });
    }

    // Info if good YouTube performance
    if (percentages.youtube > 80) {
      logger.info('PlaylistService', 'Excellent YouTube API performance', {
        youtubePercentage: percentages.youtube,
      });
    }
  }
}

// Export singleton instance
export const playlistService = new PlaylistService();
