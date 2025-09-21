// =============================================================================
// SUPABASE DATABASE TYPES
// =============================================================================
// Generated types matching the database schema with optimizations and constraints

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      playlists: {
        Row: {
          id: string
          name: string
          description: string | null
          user_id: string
          total_duration: number | null
          genre: string | null
          energy_level: 'low' | 'medium' | 'high' | null
          created_at: string
          updated_at: string
          schemaVersion: number | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          user_id: string
          total_duration?: number | null
          genre?: string | null
          energy_level?: 'low' | 'medium' | 'high' | null
          created_at?: string
          updated_at?: string
          schemaVersion?: number | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          user_id?: string
          total_duration?: number | null
          genre?: string | null
          energy_level?: 'low' | 'medium' | 'high' | null
          created_at?: string
          updated_at?: string
          schemaVersion?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tracks: {
        Row: {
          id: string
          playlist_id: string
          title: string
          artist: string | null
          album: string | null
          duration: number | null // seconds, 0-3600
          bpm: number | null // 60-200
          energy: number | null // 0-100
          key: string | null
          genre: string | null
          energy_level: 'low' | 'medium' | 'high' | null
          position: number | null
          spotify_id: string | null
          youtube_id: string | null
          youtube_url: string | null
          preview_url: string | null
          thumbnail: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          title: string
          artist?: string | null
          album?: string | null
          duration?: number | null
          bpm?: number | null
          energy?: number | null
          key?: string | null
          genre?: string | null
          energy_level?: 'low' | 'medium' | 'high' | null
          position?: number | null
          spotify_id?: string | null
          youtube_id?: string | null
          youtube_url?: string | null
          preview_url?: string | null
          thumbnail?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          title?: string
          artist?: string | null
          album?: string | null
          duration?: number | null
          bpm?: number | null
          energy?: number | null
          key?: string | null
          genre?: string | null
          energy_level?: 'low' | 'medium' | 'high' | null
          position?: number | null
          spotify_id?: string | null
          youtube_id?: string | null
          youtube_url?: string | null
          preview_url?: string | null
          thumbnail?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          playlist_id: string | null
          status: 'active' | 'completed' | 'paused'
          started_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          playlist_id?: string | null
          status?: 'active' | 'completed' | 'paused'
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          playlist_id?: string | null
          status?: 'active' | 'completed' | 'paused'
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// =============================================================================
// CONVENIENT TYPE ALIASES
// =============================================================================

export type Playlist = Tables<'playlists'>
export type PlaylistInsert = TablesInsert<'playlists'>
export type PlaylistUpdate = TablesUpdate<'playlists'>

export type Track = Tables<'tracks'>
export type TrackInsert = TablesInsert<'tracks'>
export type TrackUpdate = TablesUpdate<'tracks'>

export type Session = Tables<'sessions'>
export type SessionInsert = TablesInsert<'sessions'>
export type SessionUpdate = TablesUpdate<'sessions'>