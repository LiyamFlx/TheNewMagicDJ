-- =============================================================================
-- SCHEMA OPTIMIZATION AND NORMALIZATION
-- =============================================================================
-- Adds constraints, optimizes data types, and improves normalization

-- =============================================================================
-- ADD MISSING COLUMNS AND CONSTRAINTS
-- =============================================================================

-- Playlists: Add missing timestamp columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'playlists' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.playlists ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Sessions: Add missing columns for proper session tracking
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'playlist_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN playlist_id uuid REFERENCES public.playlists(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN started_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN ended_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Tracks: Add missing columns for proper track metadata
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'position'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN position int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'spotify_id'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN spotify_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'youtube_id'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN youtube_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'preview_url'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN preview_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'album'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN album text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'genre'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN genre text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'key'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN key text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'energy_level'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN energy_level text CHECK (energy_level IN ('low', 'medium', 'high'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- =============================================================================
-- DATA TYPE OPTIMIZATIONS
-- =============================================================================

-- Optimize duration to use appropriate integer constraints
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'duration'
    AND data_type = 'integer' AND is_nullable = 'YES'
  ) THEN
    -- Add constraint for reasonable duration values (0 to 1 hour = 3600 seconds)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name = 'tracks_duration_check'
    ) THEN
      ALTER TABLE public.tracks ADD CONSTRAINT tracks_duration_check
        CHECK (duration IS NULL OR (duration >= 0 AND duration <= 3600));
    END IF;
  END IF;
END $$;

-- Add constraints for BPM (beats per minute)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'bpm'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name = 'tracks_bpm_check'
    ) THEN
      ALTER TABLE public.tracks ADD CONSTRAINT tracks_bpm_check
        CHECK (bpm IS NULL OR (bpm >= 60 AND bpm <= 200));
    END IF;
  END IF;
END $$;

-- Add constraints for energy (0.0 to 1.0)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'energy'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name = 'tracks_energy_check'
    ) THEN
      ALTER TABLE public.tracks ADD CONSTRAINT tracks_energy_check
        CHECK (energy IS NULL OR (energy >= 0 AND energy <= 100));
    END IF;
  END IF;
END $$;

-- =============================================================================
-- UNIQUE CONSTRAINTS AND NORMALIZATION
-- =============================================================================

-- Ensure unique track positions within playlists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tracks_playlist_position_unique'
  ) THEN
    -- Only create unique constraint where position is not null
    CREATE UNIQUE INDEX tracks_playlist_position_unique
      ON public.tracks(playlist_id, position)
      WHERE position IS NOT NULL;
  END IF;
END $$;

-- Prevent duplicate external IDs per playlist (Spotify)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tracks_playlist_spotify_unique'
  ) THEN
    CREATE UNIQUE INDEX tracks_playlist_spotify_unique
      ON public.tracks(playlist_id, spotify_id)
      WHERE spotify_id IS NOT NULL;
  END IF;
END $$;

-- Prevent duplicate external IDs per playlist (YouTube)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tracks_playlist_youtube_unique'
  ) THEN
    CREATE UNIQUE INDEX tracks_playlist_youtube_unique
      ON public.tracks(playlist_id, youtube_id)
      WHERE youtube_id IS NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- VALIDATION CONSTRAINTS
-- =============================================================================

-- Playlist name validation
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'playlists_name_check'
  ) THEN
    ALTER TABLE public.playlists ADD CONSTRAINT playlists_name_check
      CHECK (length(trim(name)) >= 1 AND length(name) <= 255);
  END IF;
END $$;

-- Track title validation
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tracks_title_check'
  ) THEN
    ALTER TABLE public.tracks ADD CONSTRAINT tracks_title_check
      CHECK (length(trim(title)) >= 1 AND length(title) <= 500);
  END IF;
END $$;

-- Artist name validation
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'artist'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name = 'tracks_artist_check'
    ) THEN
      ALTER TABLE public.tracks ADD CONSTRAINT tracks_artist_check
        CHECK (artist IS NULL OR (length(trim(artist)) >= 1 AND length(artist) <= 500));
    END IF;
  END IF;
END $$;

-- =============================================================================
-- FOREIGN KEY CONSTRAINT VALIDATION
-- =============================================================================

-- Ensure all foreign key constraints exist and are properly configured
DO $$ BEGIN
  -- Check if playlist_id FK exists on tracks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'tracks'
    AND kcu.column_name = 'playlist_id'
  ) THEN
    ALTER TABLE public.tracks
      ADD CONSTRAINT tracks_playlist_id_fkey
      FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- CLEANUP AND OPTIMIZATION
-- =============================================================================

-- Update table statistics for query planner
ANALYZE public.playlists;
ANALYZE public.tracks;
ANALYZE public.sessions;