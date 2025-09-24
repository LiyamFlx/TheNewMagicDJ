-- Debug authentication and RLS policies

-- Create a debug function to check auth state
CREATE OR REPLACE FUNCTION debug_auth_state()
RETURNS TABLE (
  auth_uid text,
  auth_role text,
  current_user_name text,
  session_user_name text
) AS $$
BEGIN
  RETURN QUERY SELECT
    auth.uid()::text,
    auth.role(),
    current_user,
    session_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_auth_state() TO authenticated;

-- Simplify playlist policies for debugging
DROP POLICY IF EXISTS "playlists_user_access" ON public.playlists;
DROP POLICY IF EXISTS "playlists_authenticated_access" ON public.playlists;

-- Create more permissive policy for testing
CREATE POLICY "playlists_authenticated_access" ON public.playlists
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Same for tracks
DROP POLICY IF EXISTS "tracks_user_access" ON public.tracks;
DROP POLICY IF EXISTS "tracks_authenticated_access" ON public.tracks;

CREATE POLICY "tracks_authenticated_access" ON public.tracks
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add temporary logging to see what's happening
CREATE OR REPLACE FUNCTION log_playlist_access()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Playlist access: auth.uid()=%, auth.role()=%, user_id=%',
    auth.uid(), auth.role(), COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to log access attempts
DROP TRIGGER IF EXISTS playlist_access_log ON public.playlists;
CREATE TRIGGER playlist_access_log
  BEFORE INSERT OR UPDATE OR DELETE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION log_playlist_access();