-- Fix and improve indexing, RLS enforcement, and auditing columns/triggers
-- Safe/idempotent: uses IF EXISTS/IF NOT EXISTS and guards.

-- 1) Correct/complete performance indexes for RLS and common queries

-- Ensure FK indexes exist (some created in prior migrations)
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_id ON public.tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_playlist_id ON public.sessions(playlist_id);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_session_id ON public.analytics_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_crowd_analytics_session_id ON public.crowd_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON public.session_logs(session_id);

-- Replace invalid/nonexistent column indexes from previous migration
-- Tracks: prefer composite for playlist ordering by created_at
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_created_at ON public.tracks(playlist_id, created_at DESC);

-- Analytics/logs: index actual timestamp columns
CREATE INDEX IF NOT EXISTS idx_analytics_logs_created_at ON public.analytics_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_crowd_analytics_detected_at ON public.crowd_analytics(detected_at);
CREATE INDEX IF NOT EXISTS idx_session_logs_created_at ON public.session_logs(created_at);

-- 2) RLS hardening (force RLS where applicable)
ALTER TABLE IF EXISTS public.playlists FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracks FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crowd_analytics FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_recommendations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.device_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users FORCE ROW LEVEL SECURITY;

-- 3) Auditing columns and triggers (created_at already present; add updated_at)
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.playlists ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.tracks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.analytics_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.crowd_analytics ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.ai_recommendations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.device_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.session_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create or replace generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper to conditionally create trigger only when column exists
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = rec.tablename AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = %L
          ) THEN
            CREATE TRIGGER %I
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
          END IF;
        END$$;', 'update_' || rec.tablename || '_updated_at', 'update_' || rec.tablename || '_updated_at', rec.tablename);
    END IF;
  END LOOP;
END$$;

-- 4) Optional: document deprecation of wide JSONB in playlists (tracks, metadata)
COMMENT ON COLUMN public.playlists.tracks IS 'Deprecated: use public.tracks table instead.';
COMMENT ON COLUMN public.playlists.metadata IS 'Auxiliary metadata; avoid heavy nested objects.';

