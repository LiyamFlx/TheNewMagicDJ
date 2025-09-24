-- Events table for analytics and crowd inputs
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid null references public.sessions(id) on delete set null,
  playlist_id uuid null references public.playlists(id) on delete set null,
  type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- RLS: users can manage their own events
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_select_own'
  ) then
    create policy events_select_own on public.events for select using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_insert_own'
  ) then
    create policy events_insert_own on public.events for insert with check (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_delete_own'
  ) then
    create policy events_delete_own on public.events for delete using (user_id = auth.uid());
  end if;
end $$;

create index if not exists idx_events_user_created on public.events(user_id, created_at desc);
create index if not exists idx_events_session_created on public.events(session_id, created_at desc);

