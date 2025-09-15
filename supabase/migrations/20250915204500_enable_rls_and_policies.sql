-- Enable RLS and add safe default policies

-- Users
alter table if exists public.users enable row level security;
alter table if exists public.users force row level security;
drop policy if exists select_own_user on public.users;
drop policy if exists modify_own_user on public.users;
create policy select_own_user on public.users for select using ( id = auth.uid() );
create policy modify_own_user on public.users for all using ( id = auth.uid() ) with check ( id = auth.uid() );

-- Profiles
alter table if exists public.profiles enable row level security;
alter table if exists public.profiles force row level security;
drop policy if exists profiles_public_read on public.profiles;
drop policy if exists profiles_owner_write on public.profiles;
create policy profiles_public_read on public.profiles for select using ( true );
create policy profiles_owner_write on public.profiles for all using ( id = auth.uid() ) with check ( id = auth.uid() );

-- Playlists
alter table if exists public.playlists enable row level security;
alter table if exists public.playlists force row level security;
drop policy if exists select_own_playlists on public.playlists;
drop policy if exists modify_own_playlists on public.playlists;
create policy select_own_playlists on public.playlists for select using ( user_id = auth.uid() );
create policy modify_own_playlists on public.playlists for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- Tracks (scoped to playlist owner)
alter table if exists public.tracks enable row level security;
alter table if exists public.tracks force row level security;
drop policy if exists select_tracks_of_own_playlists on public.tracks;
drop policy if exists modify_tracks_of_own_playlists on public.tracks;
create policy select_tracks_of_own_playlists on public.tracks for select using (
  exists (
    select 1 from public.playlists p where p.id = tracks.playlist_id and p.user_id = auth.uid()
  )
);
create policy modify_tracks_of_own_playlists on public.tracks for all using (
  exists (
    select 1 from public.playlists p where p.id = tracks.playlist_id and p.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.playlists p where p.id = tracks.playlist_id and p.user_id = auth.uid()
  )
);

-- Sessions
alter table if exists public.sessions enable row level security;
alter table if exists public.sessions force row level security;
drop policy if exists select_own_sessions on public.sessions;
drop policy if exists modify_own_sessions on public.sessions;
create policy select_own_sessions on public.sessions for select using ( user_id = auth.uid() );
create policy modify_own_sessions on public.sessions for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- Analytics logs (scoped via session)
alter table if exists public.analytics_logs enable row level security;
alter table if exists public.analytics_logs force row level security;
drop policy if exists select_own_analytics_logs on public.analytics_logs;
drop policy if exists modify_own_analytics_logs on public.analytics_logs;
create policy select_own_analytics_logs on public.analytics_logs for select using (
  exists (
    select 1 from public.sessions s where s.id = analytics_logs.session_id and s.user_id = auth.uid()
  )
);
create policy modify_own_analytics_logs on public.analytics_logs for all using (
  exists (
    select 1 from public.sessions s where s.id = analytics_logs.session_id and s.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.sessions s where s.id = analytics_logs.session_id and s.user_id = auth.uid()
  )
);

-- Crowd analytics (scoped via session)
alter table if exists public.crowd_analytics enable row level security;
alter table if exists public.crowd_analytics force row level security;
drop policy if exists select_own_crowd_analytics on public.crowd_analytics;
drop policy if exists modify_own_crowd_analytics on public.crowd_analytics;
create policy select_own_crowd_analytics on public.crowd_analytics for select using (
  exists (
    select 1 from public.sessions s where s.id = crowd_analytics.session_id and s.user_id = auth.uid()
  )
);
create policy modify_own_crowd_analytics on public.crowd_analytics for all using (
  exists (
    select 1 from public.sessions s where s.id = crowd_analytics.session_id and s.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.sessions s where s.id = crowd_analytics.session_id and s.user_id = auth.uid()
  )
);

-- AI recommendations (by user or via session)
alter table if exists public.ai_recommendations enable row level security;
alter table if exists public.ai_recommendations force row level security;
drop policy if exists select_own_ai_recommendations on public.ai_recommendations;
drop policy if exists modify_own_ai_recommendations on public.ai_recommendations;
create policy select_own_ai_recommendations on public.ai_recommendations for select using (
  user_id = auth.uid() or exists (
    select 1 from public.sessions s where s.id = ai_recommendations.session_id and s.user_id = auth.uid()
  )
);
create policy modify_own_ai_recommendations on public.ai_recommendations for all using (
  user_id = auth.uid() or exists (
    select 1 from public.sessions s where s.id = ai_recommendations.session_id and s.user_id = auth.uid()
  )
) with check (
  user_id = auth.uid() or exists (
    select 1 from public.sessions s where s.id = ai_recommendations.session_id and s.user_id = auth.uid()
  )
);

-- Device settings
alter table if exists public.device_settings enable row level security;
alter table if exists public.device_settings force row level security;
drop policy if exists select_own_device_settings on public.device_settings;
drop policy if exists modify_own_device_settings on public.device_settings;
create policy select_own_device_settings on public.device_settings for select using ( user_id = auth.uid() );
create policy modify_own_device_settings on public.device_settings for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- Session logs (scoped via session)
alter table if exists public.session_logs enable row level security;
alter table if exists public.session_logs force row level security;
drop policy if exists select_own_session_logs on public.session_logs;
drop policy if exists modify_own_session_logs on public.session_logs;
create policy select_own_session_logs on public.session_logs for select using (
  exists (
    select 1 from public.sessions s where s.id = session_logs.session_id and s.user_id = auth.uid()
  )
);
create policy modify_own_session_logs on public.session_logs for all using (
  exists (
    select 1 from public.sessions s where s.id = session_logs.session_id and s.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.sessions s where s.id = session_logs.session_id and s.user_id = auth.uid()
  )
);

