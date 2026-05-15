-- Phase 7.5 — vendor directory and event-vendor assignment.
-- vendors: the planner's personal directory of service providers.
-- event_vendors: the many-to-many join between events and vendors,
--   tracking assignment status and planner notes.
-- NOTE: invite_token, vendor_user_id, responded_at were added later
--       in Phase 8.5A (see phase-8.5A-prep.sql).
-- NOTE: client SELECT on event_vendors and vendors was added in Phase 8
--       (see phase-8-prep.sql and phase-8.5A-rls-fixes.sql).

-- ── vendors ───────────────────────────────────────────────────────────────────

create table if not exists public.vendors (
  id         uuid        primary key default gen_random_uuid(),
  planner_id uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  category   text        not null,
  email      text,
  phone      text,
  location   text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_vendors_updated_at on public.vendors;
create trigger update_vendors_updated_at
  before update on public.vendors
  for each row execute procedure public.update_updated_at_column();

alter table public.vendors enable row level security;

drop policy if exists "planners_manage_own_vendors" on public.vendors;
create policy "planners_manage_own_vendors"
  on public.vendors for all to authenticated
  using (planner_id = auth.uid())
  with check (planner_id = auth.uid());

-- ── event_vendors ─────────────────────────────────────────────────────────────

create table if not exists public.event_vendors (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.events(id) on delete cascade,
  vendor_id  uuid        not null references public.vendors(id) on delete cascade,
  status     text        not null default 'invited'
                         check (status in ('invited', 'confirmed', 'declined')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, vendor_id)
);

drop trigger if exists update_event_vendors_updated_at on public.event_vendors;
create trigger update_event_vendors_updated_at
  before update on public.event_vendors
  for each row execute procedure public.update_updated_at_column();

alter table public.event_vendors enable row level security;

drop policy if exists "planners_manage_own_event_vendors" on public.event_vendors;
create policy "planners_manage_own_event_vendors"
  on public.event_vendors for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_vendors.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_vendors.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  );
