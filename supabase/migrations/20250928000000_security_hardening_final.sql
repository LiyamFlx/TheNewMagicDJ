-- =====================================================
-- SECURITY HARDENING & RLS POLICY CLEANUP
-- =====================================================
-- This migration implements production-ready security policies
-- Replaces all previous conflicting RLS configurations

-- =====================================================
-- 1. CLEAN SLATE: Remove all existing policies
-- =====================================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can manage tracks in their playlists" ON tracks;
DROP POLICY IF EXISTS "playlists_user_access" ON playlists;
DROP POLICY IF EXISTS "tracks_user_access" ON tracks;
DROP POLICY IF EXISTS "sessions_user_access" ON sessions;
DROP POLICY IF EXISTS "playlists_authenticated_access" ON playlists;
DROP POLICY IF EXISTS "tracks_authenticated_access" ON tracks;
DROP POLICY IF EXISTS "sessions_authenticated_access" ON sessions;
DROP POLICY IF EXISTS "playlists_anon_deny" ON playlists;
DROP POLICY IF EXISTS "tracks_anon_deny" ON tracks;
DROP POLICY IF EXISTS "sessions_anon_deny" ON sessions;
DROP POLICY IF EXISTS "playlists_select_own" ON playlists;
DROP POLICY IF EXISTS "playlists_insert_own" ON playlists;
DROP POLICY IF EXISTS "playlists_update_own" ON playlists;
DROP POLICY IF EXISTS "playlists_delete_own" ON playlists;
DROP POLICY IF EXISTS "tracks_select_own" ON tracks;
DROP POLICY IF EXISTS "tracks_insert_own" ON tracks;
DROP POLICY IF EXISTS "tracks_update_own" ON tracks;
DROP POLICY IF EXISTS "tracks_delete_own" ON tracks;
DROP POLICY IF EXISTS "sessions_select_own" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_own" ON sessions;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. SECURE PLAYLISTS POLICIES
-- =====================================================

-- Allow authenticated users to see only their own playlists
CREATE POLICY "secure_playlists_select" ON public.playlists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to create playlists for themselves
CREATE POLICY "secure_playlists_insert" ON public.playlists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update only their own playlists
CREATE POLICY "secure_playlists_update" ON public.playlists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete only their own playlists
CREATE POLICY "secure_playlists_delete" ON public.playlists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Deny all access to anonymous users
CREATE POLICY "secure_playlists_anon_deny" ON public.playlists
  FOR ALL
  TO anon
  USING (false);

-- =====================================================
-- 3. SECURE TRACKS POLICIES
-- =====================================================

-- Allow authenticated users to see tracks in their playlists
CREATE POLICY "secure_tracks_select" ON public.tracks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Allow authenticated users to add tracks to their playlists
CREATE POLICY "secure_tracks_insert" ON public.tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Allow authenticated users to update tracks in their playlists
CREATE POLICY "secure_tracks_update" ON public.tracks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Allow authenticated users to delete tracks from their playlists
CREATE POLICY "secure_tracks_delete" ON public.tracks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Deny all access to anonymous users
CREATE POLICY "secure_tracks_anon_deny" ON public.tracks
  FOR ALL
  TO anon
  USING (false);

-- =====================================================
-- 4. SECURE SESSIONS POLICIES
-- =====================================================

-- Allow authenticated users to see only their own sessions
CREATE POLICY "secure_sessions_select" ON public.sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to create sessions for themselves
CREATE POLICY "secure_sessions_insert" ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update only their own sessions
CREATE POLICY "secure_sessions_update" ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete only their own sessions
CREATE POLICY "secure_sessions_delete" ON public.sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Deny all access to anonymous users
CREATE POLICY "secure_sessions_anon_deny" ON public.sessions
  FOR ALL
  TO anon
  USING (false);

-- =====================================================
-- 5. SECURE EVENTS POLICIES
-- =====================================================

-- Allow authenticated users to see only their own events
CREATE POLICY "secure_events_select" ON public.events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to create events for themselves
CREATE POLICY "secure_events_insert" ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update only their own events
CREATE POLICY "secure_events_update" ON public.events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete only their own events
CREATE POLICY "secure_events_delete" ON public.events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Deny all access to anonymous users
CREATE POLICY "secure_events_anon_deny" ON public.events
  FOR ALL
  TO anon
  USING (false);

-- =====================================================
-- 6. SECURE PROFILES POLICIES (if table exists)
-- =====================================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to see only their own profile
CREATE POLICY "secure_profiles_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to create their own profile
CREATE POLICY "secure_profiles_insert" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update only their own profile
CREATE POLICY "secure_profiles_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to delete only their own profile
CREATE POLICY "secure_profiles_delete" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Deny all access to anonymous users
CREATE POLICY "secure_profiles_anon_deny" ON public.profiles
  FOR ALL
  TO anon
  USING (false);

-- =====================================================
-- 7. ADDITIONAL SECURITY MEASURES
-- =====================================================

-- Add updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_id ON public.tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);

-- Add constraints for data integrity
ALTER TABLE public.playlists ADD CONSTRAINT check_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE public.tracks ADD CONSTRAINT check_title_not_empty CHECK (length(trim(title)) > 0);

-- Revoke unnecessary permissions from public
REVOKE ALL ON public.playlists FROM anon;
REVOKE ALL ON public.tracks FROM anon;
REVOKE ALL ON public.sessions FROM anon;
REVOKE ALL ON public.events FROM anon;
REVOKE ALL ON public.profiles FROM anon;

-- Grant specific permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Comment the security implementation
COMMENT ON TABLE public.playlists IS 'User playlists - RLS enforced, user can only access own data';
COMMENT ON TABLE public.tracks IS 'Playlist tracks - RLS enforced via playlist ownership';
COMMENT ON TABLE public.sessions IS 'User sessions - RLS enforced, user can only access own data';
COMMENT ON TABLE public.events IS 'User events - RLS enforced, user can only access own data';
COMMENT ON TABLE public.profiles IS 'User profiles - RLS enforced, user can only access own data';