export interface Track {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  energy?: number;
  key?: string;
  preview_url?: string;
  bpm?: number;
  danceability?: number;
  valence?: number;
  album?: string;
  images?: { url: string; height: number; width: number }[];
  external_urls?: { [key: string]: string };
  spotify_id?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  type?: string;
  total_duration?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  user_id?: string;
}

export interface Session {
  id: string;
  user_id: string;
  playlist_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed';
  name: string;
  tracks: number;
  duration: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

// Recognition results from third-party services
export interface RecognitionResult {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  confidence: number;
  preview_url?: string;
  spotify_id?: string;
}

// Audio fingerprint payloads used in processing
export interface AudioFingerprint {
  fingerprint: string;
  confidence: number;
  duration: number;
}
