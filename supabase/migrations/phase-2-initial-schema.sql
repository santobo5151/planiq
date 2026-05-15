-- Phase 2 — initial database schema and RLS.
-- Creates all core tables: organizations, profiles, events, invites, guests.
-- Includes the auto-create-profile trigger fired on Supabase auth user signup.
-- Initial RLS: planners manage their own data; clients can SELECT only the
-- event they are directly linked to (via events.client_id). Invite-accepted
-- client access was added in Phase 8. Guest RLS was extended in Phase 9A.

-- ── Shared updated_at trigger function ──────────────────────────────────────

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Auto-create profile on auth signup ───────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ── organizations ─────────────────────────────────────────────────────────────

create table if not exists public.organizations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists update_organizations_updated_at on public.organizations;
create trigger update_organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.update_updated_at_column();

alter table public.organizations enable row level security;

drop policy if exists "organizations_manage_own" on public.organizations;
create policy "organizations_manage_own"
  on public.organizations for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── profiles ──────────────────────────────────────────────────────────────────
-- NOTE: profiles_role_check originally allowed only 'planner' and 'client'.
--       'vendor' was added in Phase 8.5A (see phase-8.5A-prep.sql).
-- NOTE: Phase 8 added a SELECT policy for collaborator planner names
--       (see phase-8-profile-rls.sql).

create table if not exists public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  role            text,
  full_name       text,
  avatar_url      text,
  organization_id uuid        references public.organizations(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('planner', 'client'));

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── events ────────────────────────────────────────────────────────────────────
-- NOTE: rsvp_deadline was added in Phase 9B (see phase-9B-prep.sql).
-- NOTE: client SELECT policy was added in Phase 8 (see phase-8-prep.sql).

create table if not exists public.events (
  id               uuid        primary key default gen_random_uuid(),
  created_by       uuid        not null references auth.users(id) on delete cascade,
  planner_id       uuid        references auth.users(id),
  client_id        uuid        references auth.users(id),
  organization_id  uuid        references public.organizations(id),
  title            text        not null,
  event_type       text,
  location         text,
  event_date       date,
  guest_count      integer,
  budget_ceiling   numeric,
  theme            text,
  food_preferences text,
  status           text        not null default 'draft'
                               check (status in ('draft', 'active', 'completed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists update_events_updated_at on public.events;
create trigger update_events_updated_at
  before update on public.events
  for each row execute procedure public.update_updated_at_column();

alter table public.events enable row level security;

drop policy if exists "planners_manage_own_events" on public.events;
create policy "planners_manage_own_events"
  on public.events for all to authenticated
  using (auth.uid() = created_by or auth.uid() = planner_id)
  with check (auth.uid() = created_by or auth.uid() = planner_id);

-- ── invites ───────────────────────────────────────────────────────────────────
-- Token-based invite links sent to clients for event collaboration.
-- NOTE: client_user_id was added in Phase 8 (see phase-8-prep.sql).
-- Token lookups and accept writes use the admin client (bypass RLS),
-- so no public SELECT policy is needed here.

create table if not exists public.invites (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references public.events(id) on delete cascade,
  email       text        not null,
  token       text        not null unique,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.invites enable row level security;

drop policy if exists "planners_manage_own_invites" on public.invites;
create policy "planners_manage_own_invites"
  on public.invites for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = invites.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = invites.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  );

-- ── guests ────────────────────────────────────────────────────────────────────
-- Guest list for events, used for RSVP tracking.
-- NOTE: Phase 9A.1 dropped 'name' and added 'first_name'/'last_name'.
-- NOTE: rsvp_token, plus_one_allowed, rsvp_responded_at added in Phase 9B.
-- NOTE: rsvp_sent_at added in Phase 9B polish.
-- NOTE: Phase 9A rewrote both RLS policies to include invite-accepted clients.

create table if not exists public.guests (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references public.events(id) on delete cascade,
  name          text        not null,
  email         text,
  rsvp_status   text        not null default 'pending'
                            check (rsvp_status in ('pending', 'attending', 'declined')),
  dietary_notes text,
  plus_one      boolean     not null default false,
  created_at    timestamptz not null default now()
);

alter table public.guests enable row level security;

drop policy if exists "guests_planner_manage" on public.guests;
create policy "guests_planner_manage"
  on public.guests for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = guests.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = guests.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  );

-- Phase 2 baseline: planner + directly-linked client only.
-- Phase 9A later extended this to also cover invite-accepted clients.
drop policy if exists "guests_select_participant" on public.guests;
create policy "guests_select_participant"
  on public.guests for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = guests.event_id
        and (
          auth.uid() = e.created_by
          or auth.uid() = e.planner_id
          or auth.uid() = e.client_id
        )
    )
  );
