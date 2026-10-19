-- Drift schema on Supabase Cloud project kzuvsgxqanawydghfqqp ("srcc") —
-- this is fw-srcc's (D:\codes\fw-srcc) real, actively-developed backend,
-- NOT an idle project (see CLAUDE.md "Backend correction" for the full
-- story — sharing it was a deliberate, user-confirmed call, not a mistake).
-- Every table is drift_-prefixed — see CLAUDE.md "Multi-tenancy" section.
--
-- APPLIED 2026-10-19 via the dashboard SQL editor (CLI db push/link were
-- blocked by a supabase CLI 2.112.0 bug, see CLAUDE.md). The
-- drift_sessions/drift_session_members mutual-RLS fix (SECURITY DEFINER
-- helper functions below) was added the same day after the original
-- version 500'd with "infinite recursion detected in policy" on first
-- real query — if re-applying this file from scratch, this version already
-- has the fix baked in.

create table if not exists drift_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_anonymous boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists drift_play_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  kind text not null check (kind in ('play', 'skip', 'like', 'unlike')),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists drift_play_events_user_idx on drift_play_events(user_id);
create index if not exists drift_play_events_track_idx on drift_play_events(track_id);

create table if not exists drift_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists drift_playlist_tracks (
  id bigint generated always as identity primary key,
  playlist_id uuid not null references drift_playlists(id) on delete cascade,
  track_id text not null,
  position integer not null,
  added_at timestamptz not null default now()
);
create index if not exists drift_playlist_tracks_playlist_idx on drift_playlist_tracks(playlist_id);

-- Sync-listen sessions: queue + transport-state sync only (no sample-accurate
-- audio sync — see CLAUDE.md). One row per session, realtime channel keyed
-- by id.
create table if not exists drift_sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  queue jsonb not null default '[]',
  current_index integer not null default 0,
  is_playing boolean not null default false,
  position_seconds numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists drift_session_members (
  session_id uuid not null references drift_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- RLS: enable + owner-scoped policies. flextudy's real backend doesn't use
-- Postgres RLS at all (custom Node auth-service instead), so there's no
-- existing style to match — these are written from scratch, standard
-- Supabase auth.uid() ownership pattern.
alter table drift_profiles enable row level security;
alter table drift_play_events enable row level security;
alter table drift_playlists enable row level security;
alter table drift_playlist_tracks enable row level security;
alter table drift_sessions enable row level security;
alter table drift_session_members enable row level security;

-- drift_profiles: a user can only see/manage their own profile row.
create policy "drift_profiles_select_own" on drift_profiles
  for select using (auth.uid() = id);
create policy "drift_profiles_insert_own" on drift_profiles
  for insert with check (auth.uid() = id);
create policy "drift_profiles_update_own" on drift_profiles
  for update using (auth.uid() = id);

-- drift_play_events: append-only log. A user can insert and read their own
-- events; no update/delete — it's a training-data log, not editable state.
create policy "drift_play_events_select_own" on drift_play_events
  for select using (auth.uid() = user_id);
create policy "drift_play_events_insert_own" on drift_play_events
  for insert with check (auth.uid() = user_id);

-- drift_playlists: full CRUD, owner only.
create policy "drift_playlists_select_own" on drift_playlists
  for select using (auth.uid() = user_id);
create policy "drift_playlists_insert_own" on drift_playlists
  for insert with check (auth.uid() = user_id);
create policy "drift_playlists_update_own" on drift_playlists
  for update using (auth.uid() = user_id);
create policy "drift_playlists_delete_own" on drift_playlists
  for delete using (auth.uid() = user_id);

-- drift_playlist_tracks: gated through playlist ownership (no user_id column
-- of its own — ownership is derived via the parent drift_playlists row).
create policy "drift_playlist_tracks_select_own" on drift_playlist_tracks
  for select using (
    exists (
      select 1 from drift_playlists p
      where p.id = drift_playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );
create policy "drift_playlist_tracks_insert_own" on drift_playlist_tracks
  for insert with check (
    exists (
      select 1 from drift_playlists p
      where p.id = drift_playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );
create policy "drift_playlist_tracks_update_own" on drift_playlist_tracks
  for update using (
    exists (
      select 1 from drift_playlists p
      where p.id = drift_playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );
create policy "drift_playlist_tracks_delete_own" on drift_playlist_tracks
  for delete using (
    exists (
      select 1 from drift_playlists p
      where p.id = drift_playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );

-- drift_sessions <-> drift_session_members RLS is mutually recursive (each
-- table's policy does an EXISTS lookup into the other), which Postgres
-- detects and rejects with "infinite recursion detected in policy for
-- relation" (42P17) the moment either table is queried. SECURITY DEFINER
-- helper functions break the cycle — they run with the function owner's
-- privileges, bypassing RLS on their own internal query, so evaluating one
-- table's policy no longer re-triggers the other table's policy.
create or replace function drift_is_session_member(p_session_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from drift_session_members m
    where m.session_id = p_session_id and m.user_id = p_user_id
  );
$$;

create or replace function drift_is_session_host(p_session_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from drift_sessions s
    where s.id = p_session_id and s.host_user_id = p_user_id
  );
$$;

-- drift_sessions: host has full control. Any joined member can read the
-- session to follow queue/transport state — that's the whole point of
-- sync-listen. Only the host mutates it.
create policy "drift_sessions_select_member" on drift_sessions
  for select using (
    auth.uid() = host_user_id
    or drift_is_session_member(id, auth.uid())
  );
create policy "drift_sessions_insert_host" on drift_sessions
  for insert with check (auth.uid() = host_user_id);
create policy "drift_sessions_update_host" on drift_sessions
  for update using (auth.uid() = host_user_id);
create policy "drift_sessions_delete_host" on drift_sessions
  for delete using (auth.uid() = host_user_id);

-- drift_session_members: a user manages their own membership row (join by
-- inserting, leave by deleting). The host can also read the full member
-- list for their session.
create policy "drift_session_members_select" on drift_session_members
  for select using (
    auth.uid() = user_id
    or drift_is_session_host(session_id, auth.uid())
  );
create policy "drift_session_members_insert_self" on drift_session_members
  for insert with check (auth.uid() = user_id);
create policy "drift_session_members_delete_self" on drift_session_members
  for delete using (auth.uid() = user_id);

-- Realtime: drift_sessions UPDATE/DELETE events (the only channel
-- sync-listen members subscribe to, see src/lib/syncSession.ts) require the
-- table to be in the supabase_realtime publication — not on by default for
-- a table created outside the dashboard's "Enable Realtime" toggle. Run
-- this once (safe to re-run, no-ops if already added).
alter publication supabase_realtime add table drift_sessions;
