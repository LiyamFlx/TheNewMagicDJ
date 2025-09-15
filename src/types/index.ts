// src/types.ts

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration?: number; // optional to match all reducers/usages
  energy?: number;
  key?: string;
  album?: string; // added for Spotify/LastFM/mock data
  preview_url?: string | null; // allow null as Spotify may return null
  bpm?: number;
  danceability?: number;
  valence?: number;
  user_id?: string; // used in services
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  type?: "magic_match" | "magic_set"; // stricter type for LibraryProfile
  total_duration?: number;
  description?: string;
  created_at?: string;
  metadata?: Record<string, any>;
  user_id?: string; // added for playlistService
}

export interface Session {
  id: string;
  user_id: string;
  playlist_id: string;
  started_at: string;
  ended_at?: string;
  status: "active" | "completed";
}

export interface User {
  id: string;
  email: string;
  name?: string; // optional because Supabase.User has no name
  created_at: string;
}

// For supabase connection test
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  needsMigration?: boolean;
  data?: any;
  warning?: string; // added for App.tsx usage
}

// Recognition results (AcoustID / Audd / PlaylistService)
export interface RecognitionResult {
  album?: string;
  artist: string;
  title: string;
  duration?: number;
}

// Audio fingerprint type (AudioProcessingService)
export interface AudioFingerprint {
  hash: string;
  duration: number;
}
