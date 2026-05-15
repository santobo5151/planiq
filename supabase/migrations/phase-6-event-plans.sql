-- Phase 6 — AI plan generation schema.
-- Creates the event_plans table to store AI-generated event plans.
-- One plan per event, enforced by a unique constraint on event_id.
-- Planners trigger generation from the UI; the result is upserted here.
-- Client SELECT was added later in Phase 8 (see phase-8-prep.sql).

create table if not exists public.event_plans (
  id               uuid        primary key default gen_random_uuid(),
  event_id         uuid        not null unique references public.events(id) on delete cascade,
  concept_summary  text,
  timeline         jsonb,
  vendor_categories jsonb,
  recommendations  jsonb,
  model_used       text,
  prompt_version   text,
  generated_at     timestamptz not null default now()
);

alter table public.event_plans enable row level security;

drop policy if exists "planners_manage_own_event_plans" on public.event_plans;
create policy "planners_manage_own_event_plans"
  on public.event_plans for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_plans.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_plans.event_id
        and (auth.uid() = e.created_by or auth.uid() = e.planner_id)
    )
  );
