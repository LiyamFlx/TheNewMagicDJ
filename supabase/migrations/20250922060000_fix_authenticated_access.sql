-- Fix authenticated user access - current policies are too restrictive
-- The issue is that authenticated users are getting 403 errors

-- Drop current policies that are blocking authenticated users
DROP POLICY IF EXISTS "playlists_proper_access" ON public.playlists;
DROP POLICY IF EXISTS "playlists_authenticated_write" ON public.playlists;
DROP POLICY IF EXISTS "playlists_authenticated_update" ON public.playlists;
DROP POLICY IF EXISTS "playlists_authenticated_delete" ON public.playlists;

DROP POLICY IF EXISTS "tracks_proper_access" ON public.tracks;
DROP POLICY IF EXISTS "tracks_authenticated_write" ON public.tracks;
DROP POLICY IF EXISTS "tracks_authenticated_update" ON public.tracks;
DROP POLICY IF EXISTS "tracks_authenticated_delete" ON public.tracks;

-- Create simpler, working policies
-- Allow authenticated users to manage their own playlists
CREATE POLICY "playlists_user_access" ON public.playlists
  FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow authenticated users to manage tracks in their playlists
CREATE POLICY "tracks_user_access" ON public.tracks
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  );

-- Also grant basic table access to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;

-- Ensure sequences are accessible for auto-increment IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;