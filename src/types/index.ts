export interface User {
  id: string;
  email?: string;
  display_name?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  metadata?: any;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: Date;
  ended_at?: Date;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  bpm?: number;
}
