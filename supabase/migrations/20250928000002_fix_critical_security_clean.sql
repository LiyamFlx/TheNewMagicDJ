-- =====================================================
-- CRITICAL SECURITY FIXES (CLEAN VERSION)
-- =====================================================

-- =====================================================
-- 1. ENSURE ANONYMOUS USERS HAVE NO ACCESS
-- =====================================================

-- Drop and recreate SELECT policies with strict authentication
DROP POLICY IF EXISTS "secure_playlists_select" ON public.playlists;
DROP POLICY IF EXISTS "secure_tracks_select" ON public.tracks;
DROP POLICY IF EXISTS "secure_sessions_select" ON public.sessions;
DROP POLICY IF EXISTS "secure_events_select" ON public.events;

-- Recreate SELECT policies - authenticated users only
CREATE POLICY "secure_playlists_select" ON public.playlists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "secure_tracks_select" ON public.tracks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "secure_sessions_select" ON public.sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "secure_events_select" ON public.events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. BLOCK ALL ANONYMOUS ACCESS
-- =====================================================

-- Revoke all permissions from anonymous role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Create explicit denial policies for anonymous users
CREATE POLICY "block_anon_playlists" ON public.playlists
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "block_anon_tracks" ON public.tracks
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "block_anon_sessions" ON public.sessions
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "block_anon_events" ON public.events
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "block_anon_profiles" ON public.profiles
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- =====================================================
-- 3. SECURITY ENHANCEMENTS
-- =====================================================

-- Add trigger to automatically set user_id for tracks
CREATE OR REPLACE FUNCTION public.set_track_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id
  FROM public.playlists
  WHERE id = NEW.playlist_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_user_id_trigger ON public.tracks;
CREATE TRIGGER track_user_id_trigger
  BEFORE INSERT OR UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_track_user_id();

-- Add constraints only if they don't exist
DO $$
BEGIN
  -- Check and add playlists name constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'playlists_name_length_check'
  ) THEN
    ALTER TABLE public.playlists ADD CONSTRAINT playlists_name_length_check
      CHECK (length(trim(name)) BETWEEN 1 AND 255);
  END IF;

  -- Check and add tracks title constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tracks_title_length_check'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_title_length_check
      CHECK (length(trim(title)) BETWEEN 1 AND 255);
  END IF;

  -- Check and add duration constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tracks_duration_check_v2'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_duration_check_v2
      CHECK (duration IS NULL OR (duration >= 0 AND duration <= 3600));
  END IF;

  -- Check and add BPM constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tracks_bpm_check_v2'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_bpm_check_v2
      CHECK (bpm IS NULL OR (bpm >= 60 AND bpm <= 200));
  END IF;

  -- Check and add energy constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tracks_energy_check_v2'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_energy_check_v2
      CHECK (energy IS NULL OR (energy >= 0 AND energy <= 100));
  END IF;
END
$$;