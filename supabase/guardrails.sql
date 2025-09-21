-- Idempotent guardrails to ensure RLS and policies are present

-- Enable RLS
alter table if exists public.playlists enable row level security;
alter table if exists public.tracks enable row level security;

-- Policies (create if not exists via DO block)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='playlists' and policyname='Users can manage their own playlists'
  ) then
    create policy "Users can manage their own playlists" on public.playlists for all using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tracks' and policyname='Users can manage tracks in their playlists'
  ) then
    create policy "Users can manage tracks in their playlists" on public.tracks for all using (exists (select 1 from public.playlists p where p.id = tracks.playlist_id and p.user_id = auth.uid()));
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_playlists_user_id on public.playlists(user_id);
create index if not exists idx_tracks_playlist_id on public.tracks(playlist_id);

