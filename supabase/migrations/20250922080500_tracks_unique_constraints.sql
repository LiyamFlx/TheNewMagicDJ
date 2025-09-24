-- Ensure UPSERT works with PostgREST by using full UNIQUE constraints
-- Drop partial unique indexes if present
DROP INDEX IF EXISTS public.tracks_playlist_spotify_unique;
DROP INDEX IF EXISTS public.tracks_playlist_youtube_unique;
DROP INDEX IF EXISTS public.tracks_playlist_position_unique;

-- Deduplicate existing rows to avoid constraint failures
-- Keep latest by created_at (or highest id as fallback)
WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY playlist_id, spotify_id ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.tracks
  WHERE spotify_id IS NOT NULL
)
DELETE FROM public.tracks t
USING d
WHERE t.id = d.id AND d.rn > 1;

WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY playlist_id, youtube_id ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.tracks
  WHERE youtube_id IS NOT NULL
)
DELETE FROM public.tracks t
USING d
WHERE t.id = d.id AND d.rn > 1;

WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY playlist_id, position ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.tracks
  WHERE position IS NOT NULL
)
DELETE FROM public.tracks t
USING d
WHERE t.id = d.id AND d.rn > 1;

-- Add full unique constraints (NULLs allowed, so multiple NULLs won't conflict)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tracks_uniq_playlist_spotify'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_uniq_playlist_spotify UNIQUE (playlist_id, spotify_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tracks_uniq_playlist_youtube'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_uniq_playlist_youtube UNIQUE (playlist_id, youtube_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tracks_uniq_playlist_position'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_uniq_playlist_position UNIQUE (playlist_id, position);
  END IF;
END $$;

