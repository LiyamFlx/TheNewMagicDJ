-- Make profiles private by default: owner-only read/write
alter table if exists public.profiles enable row level security;
alter table if exists public.profiles force row level security;

drop policy if exists profiles_public_read on public.profiles;
drop policy if exists profiles_owner_write on public.profiles;
drop policy if exists profiles_owner_read on public.profiles;

create policy profiles_owner_read on public.profiles
  for select using ( id = auth.uid() );

create policy profiles_owner_write on public.profiles
  for all using ( id = auth.uid() )
  with check ( id = auth.uid() );

