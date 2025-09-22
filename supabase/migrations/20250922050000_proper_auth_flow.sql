-- Create a more permissive policy for development while maintaining security
-- Allow authenticated users to see their own data, anonymous users get empty results

-- Update playlists policy to return empty results for anonymous users instead of permission denied
DROP POLICY IF EXISTS "playlists_authenticated_users" ON public.playlists;

CREATE POLICY "playlists_proper_access" ON public.playlists
  FOR SELECT
  USING (
    -- Authenticated users see their own playlists
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Anonymous users see nothing but don't get permission denied
    (auth.uid() IS NULL AND false)
  );

CREATE POLICY "playlists_authenticated_write" ON public.playlists
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "playlists_authenticated_update" ON public.playlists
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "playlists_authenticated_delete" ON public.playlists
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Update tracks policy similarly
DROP POLICY IF EXISTS "tracks_authenticated_users" ON public.tracks;

CREATE POLICY "tracks_proper_access" ON public.tracks
  FOR SELECT
  USING (
    -- Authenticated users see tracks from their playlists
    (auth.uid() IS NOT NULL AND
     EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid()))
    OR
    -- Anonymous users see nothing but don't get permission denied
    (auth.uid() IS NULL AND false)
  );

CREATE POLICY "tracks_authenticated_write" ON public.tracks
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  );

CREATE POLICY "tracks_authenticated_update" ON public.tracks
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  );

CREATE POLICY "tracks_authenticated_delete" ON public.tracks
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  );