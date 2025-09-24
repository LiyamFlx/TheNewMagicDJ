export interface Track {
  url?: string;
  platform?: "youtube" | "spotify" | "demo" | "proxy" | string;
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
  youtube_id?: string;
  youtube_url?: string;
  source_url?: string; // Primary playable audio source URL
  thumbnail?: string;
  genre?: string;
  energy_level?: string;
  created_at?: string;
  updated_at?: string;
  meta?: Record<string, any>;

  // Enhanced audio analysis
  advanced_features?: AdvancedAudioFeatures;
  compatibility_score?: number;
  recognition_source?: 'live' | 'database' | 'api' | 'generated' | 'magic_set';

  // Music theory properties
  scale?: string[];
  harmonic_compatibility?: KeyCompatibility[];
  suggested_next_tracks?: TrackSuggestion[];
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
  source?: 'AudD' | 'ACRCloud' | 'Shazam' | 'Mock';
}

// Enhanced audio fingerprint with advanced features
export interface AudioFingerprint {
  fingerprint: string;
  confidence: number;
  duration: number;
  features?: AdvancedAudioFeatures;
}

// Advanced audio analysis features
export interface AdvancedAudioFeatures {
  bpm: number;
  key: string;
  genre: string;
  energy: number;
  mfcc_features: number[];
  spectral_centroid: number;
  confidence: number;
  valence?: number;
  danceability?: number;
  acousticness?: number;
  instrumentalness?: number;
}

// Music theory and compatibility analysis
export interface KeyCompatibility {
  compatible: boolean;
  score: number;
  shared_notes: number;
  reason: string;
}

// Track recommendation with compatibility scoring
export interface TrackSuggestion {
  title: string;
  artist: string;
  bpm: number;
  key: string;
  genre: string;
  compatibility_score: number;
  reason: string;
  spotify_id?: string;
  youtube_id?: string;
  preview_url?: string;
}

// Audio recognition response from Python service
export interface AudioRecognitionResponse {
  recognition: RecognitionResult | null;
  features: AdvancedAudioFeatures;
  suggestions: TrackSuggestion[];
  timestamp: string;
}

// Real-time audio capture configuration
export interface AudioCaptureConfig {
  sampleRate: number;
  channels: number;
  duration: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

// Musical scale and harmony analysis
export interface MusicTheoryAnalysis {
  scale: string[];
  chordProgression?: string[];
  harmonicTension?: number;
  modalInterchange?: string[];
  relativeKeys?: string[];
}
