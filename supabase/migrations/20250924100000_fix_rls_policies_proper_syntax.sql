-- Fix RLS policies with proper PostgreSQL syntax
-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS

-- Clean slate: Drop all existing policies first
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

-- Recreate simplified, working RLS policies
CREATE POLICY playlists_select_own
  ON public.playlists
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'anon');

CREATE POLICY playlists_insert_own
  ON public.playlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY playlists_update_own
  ON public.playlists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY playlists_delete_own
  ON public.playlists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Tracks policies - allow access to tracks in owned playlists
CREATE POLICY tracks_select_own
  ON public.tracks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND (p.user_id = auth.uid() OR auth.role() = 'anon')
    )
  );

CREATE POLICY tracks_insert_own
  ON public.tracks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY tracks_update_own
  ON public.tracks
  FOR UPDATE
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

CREATE POLICY tracks_delete_own
  ON public.tracks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Sessions policies
CREATE POLICY sessions_select_own
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY sessions_insert_own
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_update_own
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_delete_own
  ON public.sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete_own
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);