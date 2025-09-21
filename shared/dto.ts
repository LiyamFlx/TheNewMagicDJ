// Shared DTOs and type contracts used by both frontend (src) and API (api)

// Wire-level enums
export type Vibe = 'Electronic' | 'Hip-Hop' | 'House' | 'Techno';
export type EnergyLevel = 'low' | 'medium' | 'high';

// API/Client Track DTO (superset of DB fields)
export interface TrackDTO {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  album?: string;
  bpm?: number;
  energy?: number;
  genre?: Vibe | string;
  energy_level?: EnergyLevel | string;
  spotify_id?: string | null;
  preview_url?: string | null | undefined;
  youtube_id?: string | null;
  youtube_url?: string | null;
  thumbnail?: string | null;
  created_at?: string;
  updated_at?: string;
}

// API/Client Playlist DTO (wire shape)
export interface PlaylistDTO {
  id: string;
  name: string;
  description?: string;
  tracks: TrackDTO[];
  total_duration?: number;
  user_id?: string;
  genre?: Vibe | string;
  energy_level?: EnergyLevel | string;
  created_at?: string;
  updated_at?: string;
  schemaVersion?: number;
}

// DB models (subset aligned with migrations)
export interface DBPlaylist {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DBTrack {
  id: string;
  playlist_id: string;
  title: string;
  artist?: string | null;
  bpm?: number | null;
  energy?: number | null;
  duration?: number | null;
  source_url?: string | null;
  created_at?: string;
}

// Simple runtime validators (no external deps)
export function isPlaylistDTO(obj: any): obj is PlaylistDTO {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && Array.isArray(obj.tracks);
}

export const SCHEMA_VERSION = 1;

