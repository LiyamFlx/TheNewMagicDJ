-- =============================================================================
-- COMPREHENSIVE DATABASE GUARDRAILS
-- =============================================================================
-- Idempotent guardrails to ensure RLS, policies, indexes, and triggers are present

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all core tables
alter table if exists public.playlists enable row level security;
alter table if exists public.tracks enable row level security;
alter table if exists public.sessions enable row level security;

-- =============================================================================
-- SECURITY POLICIES
-- =============================================================================

-- Playlists: Users can manage their own playlists
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='playlists' and policyname='Users can manage their own playlists'
  ) then
    create policy "Users can manage their own playlists" on public.playlists for all using (user_id = auth.uid());
  end if;
end $$;

-- Tracks: Users can manage tracks in their playlists
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tracks' and policyname='Users can manage tracks in their playlists'
  ) then
    create policy "Users can manage tracks in their playlists" on public.tracks for all using (exists (select 1 from public.playlists p where p.id = tracks.playlist_id and p.user_id = auth.uid()));
  end if;
end $$;

-- Sessions: Users can manage their own sessions
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='sessions' and policyname='Users can manage their own sessions'
  ) then
    create policy "Users can manage their own sessions" on public.sessions for all using (user_id = auth.uid());
  end if;
end $$;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Core foreign key indexes
create index if not exists idx_playlists_user_id on public.playlists(user_id);
create index if not exists idx_tracks_playlist_id on public.tracks(playlist_id);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_playlist_id on public.sessions(playlist_id);

-- Composite indexes for common query patterns
create index if not exists idx_playlists_user_created on public.playlists(user_id, created_at desc);
create index if not exists idx_tracks_playlist_position on public.tracks(playlist_id, position) where position is not null;
create index if not exists idx_sessions_user_status on public.sessions(user_id, status, created_at desc);

-- Search and filtering indexes
create index if not exists idx_playlists_name_search on public.playlists using gin(to_tsvector('english', name)) where name is not null;
create index if not exists idx_tracks_search on public.tracks using gin(to_tsvector('english', title || ' ' || coalesce(artist, ''))) where title is not null;

-- =============================================================================
-- AUTOMATIC TIMESTAMP MANAGEMENT
-- =============================================================================

-- Function to update updated_at column
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Updated_at triggers for all tables
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'playlists_updated_at' and tgrelid = 'public.playlists'::regclass) then
    create trigger playlists_updated_at
      before update on public.playlists
      for each row execute function public.handle_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'tracks_updated_at' and tgrelid = 'public.tracks'::regclass) then
    create trigger tracks_updated_at
      before update on public.tracks
      for each row execute function public.handle_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'sessions_updated_at' and tgrelid = 'public.sessions'::regclass) then
    create trigger sessions_updated_at
      before update on public.sessions
      for each row execute function public.handle_updated_at();
  end if;
end $$;

