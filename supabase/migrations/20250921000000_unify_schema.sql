-- Align database schema with application Track/Playlist usage

-- Playlists: add created_at if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'playlists' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.playlists ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Tracks: add commonly used fields
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'artist'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN artist text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'bpm'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN bpm int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'energy'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN energy int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN source_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

