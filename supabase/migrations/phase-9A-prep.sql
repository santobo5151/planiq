-- Phase 9A prep — align guests RLS with Phase 8 architecture.
-- Allows reads from planners, directly-linked clients, AND clients linked 
-- via an accepted invite. Also defensively reasserts the planner-manage 
-- policy.

alter table public.guests enable row level security;

-- Planner modify policy (idempotent reassertion)
drop policy if exists "guests_planner_modify" on public.guests;
create policy "guests_planner_modify"
  on public.guests
  for all
  to authenticated
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

-- Phase 8-aligned select policy
drop policy if exists "guests_select_participant" on public.guests;
create policy "guests_select_participant"
  on public.guests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and (
          auth.uid() = e.created_by
          or auth.uid() = e.planner_id
          or auth.uid() = e.client_id
          or exists (
            select 1
            from public.invites i
            where i.event_id = e.id
              and i.client_user_id = auth.uid()
              and i.accepted_at is not null
          )
        )
    )
  );
