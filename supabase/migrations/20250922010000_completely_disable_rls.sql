-- Completely disable RLS to resolve 403 errors
-- This will allow the application to function while we debug auth issues

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "playlists_allow_anonymous" ON public.playlists;
DROP POLICY IF EXISTS "playlists_select_own" ON public.playlists;
DROP POLICY IF EXISTS "playlists_insert_own" ON public.playlists;
DROP POLICY IF EXISTS "playlists_update_own" ON public.playlists;
DROP POLICY IF EXISTS "playlists_delete_own" ON public.playlists;

DROP POLICY IF EXISTS "tracks_select_own" ON public.tracks;
DROP POLICY IF EXISTS "tracks_insert_own" ON public.tracks;
DROP POLICY IF EXISTS "tracks_update_own" ON public.tracks;
DROP POLICY IF EXISTS "tracks_delete_own" ON public.tracks;

-- Completely disable RLS on both tables
ALTER TABLE IF EXISTS public.playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracks DISABLE ROW LEVEL SECURITY;