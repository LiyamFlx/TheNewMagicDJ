-- EMERGENCY SECURITY RESTORATION
-- Immediately revoke the dangerous permissions and restore proper security

-- REVOKE ALL dangerous permissions granted to anon role
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Revoke default privilege grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- Re-enable RLS on critical tables
ALTER TABLE IF EXISTS public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;

-- Grant only basic schema usage (not full privileges)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create proper RLS policies for authenticated users only
CREATE POLICY "playlists_authenticated_users" ON public.playlists
  FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "tracks_authenticated_users" ON public.tracks
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
  );

CREATE POLICY "sessions_authenticated_users" ON public.sessions
  FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());