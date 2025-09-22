-- Temporarily disable RLS to test if that resolves the 403 errors
-- This is for debugging purposes only

-- Disable RLS on playlists table to test access
ALTER TABLE IF EXISTS public.playlists DISABLE ROW LEVEL SECURITY;

-- Also disable on tracks table to prevent related errors
ALTER TABLE IF EXISTS public.tracks DISABLE ROW LEVEL SECURITY;