-- Phase 8 prep — client collaboration RLS foundation.
-- Adds client_user_id to invites (linking accepted invite to auth user) 
-- and rewrites SELECT policies on 6 tables so authenticated clients can 
-- read event-related data when they're either events.client_id directly 
-- or linked via an accepted invite.

alter table public.invites
  add column if not exists client_user_id uuid references auth.users(id);

drop policy if exists "clients can view accessible events" on public.events;
create policy "clients can view accessible events"
  on public.events for select to authenticated
  using (
    client_id = auth.uid()
    or exists (
      select 1 from public.invites
      where invites.event_id = events.id
      and invites.client_user_id = auth.uid()
      and invites.accepted_at is not null
    )
  );

drop policy if exists "clients can view plans for accessible events" on public.event_plans;
create policy "clients can view plans for accessible events"
  on public.event_plans for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_plans.event_id
      and (
        e.client_id = auth.uid()
        or exists (
          select 1 from public.invites i
          where i.event_id = e.id
          and i.client_user_id = auth.uid()
          and i.accepted_at is not null
        )
      )
    )
  );

drop policy if exists "clients can view budgets for accessible events" on public.budgets;
create policy "clients can view budgets for accessible events"
  on public.budgets for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = budgets.event_id
      and (
        e.client_id = auth.uid()
        or exists (
          select 1 from public.invites i
          where i.event_id = e.id
          and i.client_user_id = auth.uid()
          and i.accepted_at is not null
        )
      )
    )
  );

drop policy if exists "clients can view checklists for accessible events" on public.checklists;
create policy "clients can view checklists for accessible events"
  on public.checklists for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = checklists.event_id
      and (
        e.client_id = auth.uid()
        or exists (
          select 1 from public.invites i
          where i.event_id = e.id
          and i.client_user_id = auth.uid()
          and i.accepted_at is not null
        )
      )
    )
  );

drop policy if exists "clients can view confirmed event vendors" on public.event_vendors;
create policy "clients can view confirmed event vendors"
  on public.event_vendors for select to authenticated
  using (
    status = 'confirmed'
    and exists (
      select 1 from public.events e
      where e.id = event_vendors.event_id
      and (
        e.client_id = auth.uid()
        or exists (
          select 1 from public.invites i
          where i.event_id = e.id
          and i.client_user_id = auth.uid()
          and i.accepted_at is not null
        )
      )
    )
  );

drop policy if exists "clients can view vendors via confirmed assignments" on public.vendors;
create policy "clients can view vendors via confirmed assignments"
  on public.vendors for select to authenticated
  using (
    exists (
      select 1 from public.event_vendors ev
      join public.events e on e.id = ev.event_id
      where ev.vendor_id = vendors.id
      and ev.status = 'confirmed'
      and (
        e.client_id = auth.uid()
        or exists (
          select 1 from public.invites i
          where i.event_id = e.id
          and i.client_user_id = auth.uid()
          and i.accepted_at is not null
        )
      )
    )
  );

-- NOTE: The two inline-EXISTS policies above (on event_vendors and vendors) 
-- and the events one were later rewritten to use SECURITY DEFINER helper 
-- functions to break recursion. See phase-8.5A-rls-fixes.sql.
