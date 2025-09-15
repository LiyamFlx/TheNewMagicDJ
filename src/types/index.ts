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
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}