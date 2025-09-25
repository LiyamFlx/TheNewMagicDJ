-- Enable RLS
alter table if exists public.playlists enable row level security;
alter table if exists public.tracks enable row level security;
alter table if exists public.events enable row level security;

-- Development policies (relax as needed for prod)
do $$ begin
  create policy dev_select_all_playlists on public.playlists for select using (true);
exception when others then null; end $$;
do $$ begin
  create policy dev_insert_playlists on public.playlists for insert with check (true);
exception when others then null; end $$;

do $$ begin
  create policy dev_select_all_tracks on public.tracks for select using (true);
exception when others then null; end $$;
do $$ begin
  create policy dev_insert_tracks on public.tracks for insert with check (true);
exception when others then null; end $$;

do $$ begin
  create policy dev_insert_events on public.events for insert with check (true);
exception when others then null; end $$;
do $$ begin
  create policy dev_select_events on public.events for select using (true);
exception when others then null; end $$;

-- Indexes
create index if not exists idx_playlists_user on public.playlists(user_id);
create index if not exists idx_tracks_playlist on public.tracks(playlist_id);
create index if not exists idx_events_created on public.events(created_at);

-- Optional: add updated_at default
alter table if exists public.playlists alter column updated_at set default now();
alter table if exists public.tracks alter column created_at set default now();
alter table if exists public.events alter column created_at set default now();

