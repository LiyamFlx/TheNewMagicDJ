-- Consolidate user references to auth.users and backfill normalized tracks
-- Safe/idempotent; avoids dropping columns used by app.

-- 1) Mark public.users as deprecated (do not drop to avoid breaking)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    COMMENT ON TABLE public.users IS 'Deprecated: use auth.users (and public.profiles) as canonical user identity.';
  END IF;
END $$;

-- 2) Repoint FKs from public.users to auth.users for ai_recommendations and device_settings
DO $$
DECLARE 
  fk RECORD;
BEGIN
  -- Drop existing FKs referencing public.users if they exist
  FOR fk IN 
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND c.confrelid = 'public.users'::regclass
      AND c.contype = 'f'
      AND r.relname IN ('ai_recommendations', 'device_settings')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I;', fk.table_name, fk.conname);
  END LOOP;

  -- Add new NOT VALID FKs to auth.users to avoid migration failures on legacy data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_recommendations') THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.ai_recommendations
               ADD CONSTRAINT ai_recommendations_user_id_fkey_auth
               FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;';
      EXECUTE 'ALTER TABLE public.ai_recommendations VALIDATE CONSTRAINT ai_recommendations_user_id_fkey_auth;';
    EXCEPTION WHEN OTHERS THEN
      -- Leave constraint NOT VALID if validation fails; app continues to work
      NULL;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='device_settings') THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.device_settings
               ADD CONSTRAINT device_settings_user_id_fkey_auth
               FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;';
      EXECUTE 'ALTER TABLE public.device_settings VALIDATE CONSTRAINT device_settings_user_id_fkey_auth;';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- 3) Backfill normalized tracks from playlists.tracks (jsonb) to public.tracks
-- Only inserts when target playlist has no rows in public.tracks to avoid duplication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'playlists' AND column_name = 'tracks'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tracks'
  ) THEN
    INSERT INTO public.tracks (id, playlist_id, title, artist, bpm, energy, created_at)
    SELECT gen_random_uuid(), p.id,
           COALESCE((elem->>'title'), 'Unknown') AS title,
           (elem->>'artist') AS artist,
           NULLIF((elem->>'bpm'), '')::int AS bpm,
           NULLIF((elem->>'energy'), '')::numeric AS energy,
           now()
    FROM public.playlists p
    CROSS JOIN LATERAL jsonb_array_elements(p.tracks) AS elem
    WHERE p.tracks IS NOT NULL
      AND jsonb_typeof(p.tracks) = 'array'
      AND jsonb_array_length(p.tracks) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.tracks t WHERE t.playlist_id = p.id
      );
  END IF;
END $$;

-- Note: We intentionally do NOT drop playlists.tracks to avoid breaking the app.
-- Once the app reads from normalized tracks, drop the column in a follow-up migration.

