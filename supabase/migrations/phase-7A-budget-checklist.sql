-- Phase 7A — AI budget and checklist generation schema.
-- Creates budgets and checklists tables.
-- Both tables support ai_generated=false for manually added items too.
-- Client SELECT was added later in Phase 8 (see phase-8-prep.sql).

-- ── budgets ───────────────────────────────────────────────────────────────────

create table if not exists public.budgets (
  id               uuid        primary key default gen_random_uuid(),
  event_id         uuid        not null references public.events(id) on delete cascade,
  category         text        not null,
  description      text,
  estimated_amount numeric,
  actual_amount    numeric,
  notes            text,
  status           text        not null default 'pending'
                               check (status in ('pending', 'confirmed', 'paid')),
  ai_generated     boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists update_budgets_updated_at on public.budgets;
create trigger update_budgets_updated_at
  before update on public.budgets
  for each row execute procedure public.update_updated_at_column();

alter table public.budgets enable row level security;

drop policy if exists "planners_manage_own_budgets" on public.budgets;
create policy "planners_manage_own_budgets"
  on public.budgets for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = budgets.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = budgets.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  );

-- ── checklists ────────────────────────────────────────────────────────────────

create table if not exists public.checklists (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references public.events(id) on delete cascade,
  title        text        not null,
  due_date     date,
  category     text,
  notes        text,
  status       text        not null default 'todo'
                           check (status in ('todo', 'in_progress', 'done')),
  ai_generated boolean     not null default false,
  created_at   timestamptz not null default now()
);

alter table public.checklists enable row level security;

drop policy if exists "planners_manage_own_checklists" on public.checklists;
create policy "planners_manage_own_checklists"
  on public.checklists for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = checklists.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = checklists.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  );
