-- Drop public.users if no remaining foreign key references
DO $$
DECLARE
  ref_count int;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    SELECT COUNT(*) INTO ref_count
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.users'::regclass;

    IF ref_count = 0 THEN
      EXECUTE 'DROP TABLE public.users;';
    ELSE
      COMMENT ON TABLE public.users IS 'Deprecated and retained due to existing references. Migrate FKs to auth.users before dropping.';
    END IF;
  END IF;
END $$;

