-- Production-grade RLS policies (lock down to authenticated user)
-- Apply in Supabase SQL editor. Assumes 'public' schema and columns user_id on playlists and events.

-- Enable RLS
alter table if exists public.playlists enable row level security;
alter table if exists public.tracks enable row level security;
alter table if exists public.events enable row level security;

-- Playlists: owner can read/write
do $$ begin
  create policy playlists_owner_select on public.playlists for select
    using ( auth.uid() = user_id );
exception when others then null; end $$;
do $$ begin
  create policy playlists_owner_insert on public.playlists for insert
    with check ( auth.uid() = user_id );
exception when others then null; end $$;
do $$ begin
  create policy playlists_owner_update on public.playlists for update
    using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
exception when others then null; end $$;
do $$ begin
  create policy playlists_owner_delete on public.playlists for delete
    using ( auth.uid() = user_id );
exception when others then null; end $$;

-- Tracks: join to playlists via playlist_id
do $$ begin
  create policy tracks_by_owner_select on public.tracks for select
    using ( exists (
      select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()
    ) );
exception when others then null; end $$;
do $$ begin
  create policy tracks_by_owner_upsert on public.tracks for insert
    with check ( exists (
      select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()
    ) );
exception when others then null; end $$;
do $$ begin
  create policy tracks_by_owner_update on public.tracks for update
    using ( exists (
      select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()
    ) ) with check ( exists (
      select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()
    ) );
exception when others then null; end $$;
do $$ begin
  create policy tracks_by_owner_delete on public.tracks for delete
    using ( exists (
      select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()
    ) );
exception when others then null; end $$;

-- Events: user-owned or public insert
do $$ begin
  create policy events_owner_select on public.events for select
    using ( user_id is null or auth.uid() = user_id );
exception when others then null; end $$;
do $$ begin
  create policy events_owner_insert on public.events for insert
    with check ( user_id is null or auth.uid() = user_id );
exception when others then null; end $$;

-- Indexes
create index if not exists idx_playlists_user on public.playlists(user_id);
create index if not exists idx_tracks_playlist on public.tracks(playlist_id);
create index if not exists idx_events_created on public.events(created_at);

