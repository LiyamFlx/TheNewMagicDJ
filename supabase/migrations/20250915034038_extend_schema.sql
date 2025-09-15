-- Crowd analytics
create table if not exists crowd_analytics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  energy_level numeric check (energy_level >= 0 and energy_level <= 1),
  mood text,
  detected_at timestamptz default now()
);

-- AI recommendations
create table if not exists ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  recommendation text not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  created_at timestamptz default now()
);

-- Device settings
create table if not exists device_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  device_name text not null,
  audio_config jsonb,
  created_at timestamptz default now()
);

-- Session logs
create table if not exists session_logs (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  log_level text check (log_level in ('info','warn','error')),
  message text not null,
  created_at timestamptz default now()
);
