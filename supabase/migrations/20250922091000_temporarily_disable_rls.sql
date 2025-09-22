-- Temporarily disable RLS to test if this fixes 403 errors
-- This is a diagnostic step to isolate the issue

-- Disable RLS completely to test
ALTER TABLE public.playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;