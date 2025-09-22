-- Fix the core issue: anon role needs basic table permissions
-- The 403 error is because anon role doesn't have SELECT permission on tables

-- Grant basic permissions to anon role for testing
GRANT SELECT ON public.playlists TO anon;
GRANT SELECT ON public.tracks TO anon;
GRANT SELECT ON public.sessions TO anon;

-- Grant full permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;