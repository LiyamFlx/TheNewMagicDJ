export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bpm?: number;
  key?: string;
  energy?: number;
  danceability?: number;
  valence?: number;
  preview_url?: string;
  spotify_id?: string;
  external_urls?: {
    spotify?: string;
  };
  images?: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  total_duration: number;
  created_at: string;
  user_id: string;
  type: 'magic_match' | 'magic_set';
  metadata?: {
    seed_track?: Track;
    vibe?: string;
    energy_level?: string;
    recognition_confidence?: number;
  };
}

export interface Session {
  id: string;
  user_id: string;
  playlist_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'paused';
  analytics?: {
    tracks_played: number;
    total_duration: number;
    crossfades: number;
    cue_points_used: number;
  };
}

export interface RecognitionResult {
  title: string;
  artist: string;
  album?: string;
  confidence: number;
  duration?: number;
  spotify_id?: string;
  preview_url?: string;
}

export interface AudioFingerprint {
  fingerprint: string;
  confidence: number;
  duration: number;
}