// =============================================================================
// VERSIONED API DTOS AND TYPE CONTRACTS
// =============================================================================
// Shared DTOs used by both frontend (src) and API (api) that align with database schema

import type { Playlist, Track, Session } from './database.types.js';

// =============================================================================
// DOMAIN ENUMS AND CONSTANTS
// =============================================================================

export type Vibe = 'Electronic' | 'Hip-Hop' | 'House' | 'Techno';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type SessionStatus = 'active' | 'completed' | 'paused';

export const SCHEMA_VERSION = 1;

// =============================================================================
// V1 API DTOS (CLIENT-FACING)
// =============================================================================

/**
 * Track DTO for API responses - superset of DB fields with external service data
 */
export interface TrackDTO {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number; // seconds, validated 0-3600
  bpm?: number; // beats per minute, validated 60-200
  energy?: number; // energy score 0-100
  key?: string; // musical key
  genre?: Vibe | string;
  energy_level?: EnergyLevel;
  position?: number; // track position in playlist

  // External service IDs
  spotify_id?: string | null;
  youtube_id?: string | null;
  youtube_url?: string | null;
  preview_url?: string | null;
  thumbnail?: string | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Optional enriched analytics/features and provenance
  advanced_features?: {
    bpm: number;
    key: string;
    genre?: string;
    energy: number;
    mfcc_features?: number[];
    spectral_centroid?: number;
    confidence?: number;
    valence?: number;
    danceability?: number;
    acousticness?: number;
    instrumentalness?: number;
  };
  recognition_source?: string;
}

/**
 * Playlist DTO for API responses - includes computed fields and track array
 */
export interface PlaylistDTO {
  id: string;
  name: string;
  description?: string;
  tracks: TrackDTO[];
  total_duration?: number; // computed from tracks
  user_id?: string; // included for client convenience
  genre?: Vibe | string;
  energy_level?: EnergyLevel;
  created_at?: string;
  updated_at?: string;
  schemaVersion?: number;

  // Optional playlist-level metadata for UI/analytics
  metadata?: {
    harmonic_mixing?: boolean;
    dominant_key?: string | null;
    bpm_range?: { min: number; max: number; avg: number } | null;
    advanced_features?: boolean;
    track_count?: number;
    fallback_mode?: boolean;
  };
}

/**
 * Session DTO for API responses - DJ session tracking
 */
export interface SessionDTO {
  id: string;
  user_id: string;
  playlist_id?: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// REQUEST DTOS (CLIENT TO API)
// =============================================================================

/**
 * Create playlist request
 */
export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  genre?: Vibe;
  energy_level?: EnergyLevel;
}

/**
 * Update playlist request
 */
export interface UpdatePlaylistRequest {
  name?: string;
  description?: string;
  genre?: Vibe;
  energy_level?: EnergyLevel;
}

/**
 * Add track to playlist request
 */
export interface AddTrackRequest {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  bpm?: number;
  energy?: number;
  key?: string;
  genre?: string;
  energy_level?: EnergyLevel;
  position?: number;
  spotify_id?: string;
  youtube_id?: string;
  youtube_url?: string;
  preview_url?: string;
  thumbnail?: string;
}

/**
 * Magic Set generation request
 */
export interface MagicSetRequest {
  vibe: Vibe;
  energyLevel: EnergyLevel;
  trackCount?: number;
}

/**
 * Session management requests
 */
export interface CreateSessionRequest {
  playlist_id?: string;
}

export interface UpdateSessionRequest {
  status?: SessionStatus;
  playlist_id?: string;
  ended_at?: string;
}

// =============================================================================
// DATABASE MAPPERS
// =============================================================================

/**
 * Convert database playlist to DTO (without tracks)
 */
export function playlistToDTO(playlist: Playlist): Omit<PlaylistDTO, 'tracks'> {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description || undefined,
    total_duration: playlist.total_duration || undefined,
    user_id: playlist.user_id,
    genre: playlist.genre || undefined,
    energy_level: playlist.energy_level || undefined,
    created_at: playlist.created_at,
    updated_at: playlist.updated_at,
    schemaVersion: playlist.schemaVersion || SCHEMA_VERSION,
  };
}

/**
 * Convert database track to DTO
 */
export function trackToDTO(track: Track): TrackDTO {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    album: track.album || undefined,
    duration: track.duration || undefined,
    bpm: track.bpm || undefined,
    energy: track.energy || undefined,
    key: track.key || undefined,
    genre: track.genre || undefined,
    energy_level: track.energy_level || undefined,
    position: track.position || undefined,
    spotify_id: track.spotify_id,
    youtube_id: track.youtube_id,
    youtube_url: track.youtube_url,
    preview_url: track.preview_url,
    thumbnail: track.thumbnail,
    created_at: track.created_at,
    updated_at: track.updated_at,
  };
}

/**
 * Convert database session to DTO
 */
export function sessionToDTO(session: Session): SessionDTO {
  return {
    id: session.id,
    user_id: session.user_id,
    playlist_id: session.playlist_id,
    status: session.status,
    started_at: session.started_at,
    ended_at: session.ended_at || undefined,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

// =============================================================================
// RUNTIME VALIDATORS
// =============================================================================

/**
 * Validate playlist DTO structure
 */
export function isPlaylistDTO(obj: any): obj is PlaylistDTO {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    obj.name.length >= 1 &&
    obj.name.length <= 255 &&
    Array.isArray(obj.tracks) &&
    obj.tracks.every(isTrackDTO)
  );
}

/**
 * Validate track DTO structure
 */
export function isTrackDTO(obj: any): obj is TrackDTO {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    obj.title.length >= 1 &&
    obj.title.length <= 500 &&
    typeof obj.artist === 'string' &&
    obj.artist.length >= 1 &&
    obj.artist.length <= 500 &&
    (obj.duration === undefined || (typeof obj.duration === 'number' && obj.duration >= 0 && obj.duration <= 3600)) &&
    (obj.bpm === undefined || (typeof obj.bpm === 'number' && obj.bpm >= 60 && obj.bpm <= 200)) &&
    (obj.energy === undefined || (typeof obj.energy === 'number' && obj.energy >= 0 && obj.energy <= 100))
  );
}

/**
 * Validate session DTO structure
 */
export function isSessionDTO(obj: any): obj is SessionDTO {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    ['active', 'completed', 'paused'].includes(obj.status) &&
    typeof obj.started_at === 'string'
  );
}

/**
 * Validate vibe enum
 */
export function isValidVibe(value: any): value is Vibe {
  return ['Electronic', 'Hip-Hop', 'House', 'Techno'].includes(value);
}

/**
 * Validate energy level enum
 */
export function isValidEnergyLevel(value: any): value is EnergyLevel {
  return ['low', 'medium', 'high'].includes(value);
}

/**
 * Validate magic set request
 */
export function isMagicSetRequest(obj: any): obj is MagicSetRequest {
  return (
    obj &&
    isValidVibe(obj.vibe) &&
    isValidEnergyLevel(obj.energyLevel) &&
    (obj.trackCount === undefined || (typeof obj.trackCount === 'number' && obj.trackCount >= 1 && obj.trackCount <= 50))
  );
}
