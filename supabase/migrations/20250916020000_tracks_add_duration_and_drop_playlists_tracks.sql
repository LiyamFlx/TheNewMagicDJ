-- Add duration column to tracks for UI needs; drop deprecated playlists.tracks jsonb

ALTER TABLE IF EXISTS public.tracks
  ADD COLUMN IF NOT EXISTS duration integer;

-- Drop deprecated JSONB column now that app reads normalized tracks via service
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='playlists' AND column_name='tracks'
  ) THEN
    ALTER TABLE public.playlists DROP COLUMN IF EXISTS tracks;
  END IF;
END $$;

