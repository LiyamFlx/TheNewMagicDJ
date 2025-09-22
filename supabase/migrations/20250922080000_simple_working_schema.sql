-- Simple, working schema with minimal RLS
-- No complex policies, just basic security

-- Disable RLS temporarily to clean up
ALTER TABLE IF EXISTS public.playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "playlists_authenticated_access" ON public.playlists;
DROP POLICY IF EXISTS "tracks_authenticated_access" ON public.tracks;
DROP POLICY IF EXISTS "sessions_authenticated_users" ON public.sessions;

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Simple RLS: authenticated users can access their own data
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "playlists_user_access" ON public.playlists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracks_user_access" ON public.tracks
  FOR ALL
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = tracks.playlist_id AND playlists.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = tracks.playlist_id AND playlists.user_id = auth.uid()));

CREATE POLICY "sessions_user_access" ON public.sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);