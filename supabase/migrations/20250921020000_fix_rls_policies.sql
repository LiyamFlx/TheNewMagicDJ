-- Strengthen RLS policies with explicit USING and WITH CHECK
-- Idempotent: drops existing policies (if present) and recreates them

-- Ensure RLS is enabled on core tables
ALTER TABLE IF EXISTS public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing broad policies to replace with explicit ones
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='playlists' AND policyname='Users can manage their own playlists'
  ) THEN
    DROP POLICY "Users can manage their own playlists" ON public.playlists;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracks' AND policyname='Users can manage tracks in their playlists'
  ) THEN
    DROP POLICY "Users can manage tracks in their playlists" ON public.tracks;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='Users can manage their own sessions'
  ) THEN
    DROP POLICY "Users can manage their own sessions" ON public.sessions;
  END IF;
END $$;

-- Playlists policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='playlists' AND policyname='playlists_select_own'
  ) THEN
    CREATE POLICY "playlists_select_own" ON public.playlists FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='playlists' AND policyname='playlists_insert_own'
  ) THEN
    CREATE POLICY "playlists_insert_own" ON public.playlists FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='playlists' AND policyname='playlists_update_own'
  ) THEN
    CREATE POLICY "playlists_update_own" ON public.playlists FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='playlists' AND policyname='playlists_delete_own'
  ) THEN
    CREATE POLICY "playlists_delete_own" ON public.playlists FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Tracks policies (enforce via parent playlist ownership)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracks' AND policyname='tracks_select_own'
  ) THEN
    CREATE POLICY "tracks_select_own" ON public.tracks FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracks' AND policyname='tracks_insert_own'
  ) THEN
    CREATE POLICY "tracks_insert_own" ON public.tracks FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracks' AND policyname='tracks_update_own'
  ) THEN
    CREATE POLICY "tracks_update_own" ON public.tracks FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracks' AND policyname='tracks_delete_own'
  ) THEN
    CREATE POLICY "tracks_delete_own" ON public.tracks FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

-- Sessions policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_select_own'
  ) THEN
    CREATE POLICY "sessions_select_own" ON public.sessions FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_insert_own'
  ) THEN
    CREATE POLICY "sessions_insert_own" ON public.sessions FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_update_own'
  ) THEN
    CREATE POLICY "sessions_update_own" ON public.sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_delete_own'
  ) THEN
    CREATE POLICY "sessions_delete_own" ON public.sessions FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_id ON public.tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
