-- Fix 403 errors for authenticated users accessing playlists
-- Issue: RLS policy may be too restrictive

-- Drop current restrictive policies
DROP POLICY IF EXISTS "playlists_user_access" ON public.playlists;
DROP POLICY IF EXISTS "tracks_user_access" ON public.tracks;
DROP POLICY IF EXISTS "sessions_user_access" ON public.sessions;

-- Create more permissive policies that handle auth edge cases
-- Allow authenticated users to see all their playlists
CREATE POLICY "playlists_authenticated_access" ON public.playlists
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to access tracks from their playlists
CREATE POLICY "tracks_authenticated_access" ON public.tracks
  FOR ALL
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

-- Allow authenticated users to manage their own sessions
CREATE POLICY "sessions_authenticated_access" ON public.sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure anon users get no access (they should get empty results, not 403)
CREATE POLICY "playlists_anon_deny" ON public.playlists
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "tracks_anon_deny" ON public.tracks
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "sessions_anon_deny" ON public.sessions
  FOR ALL
  TO anon
  USING (false);