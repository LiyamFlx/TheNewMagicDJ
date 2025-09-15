-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  created_at timestamptz default now()
);

-- Playlists
create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Tracks
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references playlists(id) on delete cascade,
  title text not null,
  artist text,
  bpm int,
  energy numeric,
  created_at timestamptz default now()
);

-- Sessions (DJ sessions)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  playlist_id uuid references playlists(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Analytics logs
create table if not exists analytics_logs (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  event_type text not null,
  event_data jsonb,
  created_at timestamptz default now()
);
