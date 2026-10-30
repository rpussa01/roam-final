-- Run once in the Supabase SQL editor. All user data is protected by RLS.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.saved_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  place jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,place_id)
);
create table if not exists public.trips (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  trip jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists trips_user_created on public.trips(user_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.saved_places enable row level security;
alter table public.trips enable row level security;
drop policy if exists "Own profiles" on public.profiles;
create policy "Own profiles" on public.profiles for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
drop policy if exists "Own saved places" on public.saved_places;
create policy "Own saved places" on public.saved_places for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Own trips" on public.trips;
create policy "Own trips" on public.trips for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
