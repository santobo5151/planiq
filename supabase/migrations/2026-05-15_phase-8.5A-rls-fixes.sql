-- Phase 8.5A RLS recursion fixes.
-- 
-- During Phase 8.5A testing, planner Assign/UpdateStatus on event_vendors 
-- triggered "infinite recursion detected in policy" errors. Root cause: 
-- the policy graph across events, event_vendors, and vendors created 
-- inline EXISTS subqueries that referenced each other across tables.
-- 
-- Fix: replace inline EXISTS chains with SECURITY DEFINER helper functions. 
-- Helpers run with elevated privileges, bypassing RLS on their internal 
-- queries, which breaks the recursion cycle.

-- Helper 1: is the given user a vendor assigned to the given event?
-- (Defined but unused after we dropped events_select_assigned_vendor. 
-- Phase 8.5C will reuse it inside a role-guarded vendor policy.)
create or replace function public.user_is_assigned_vendor_for_event(
  p_event_id uuid,
  p_user_id uuid
) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_vendors ev
    where ev.event_id = p_event_id and ev.vendor_user_id = p_user_id
  );
$$;
revoke all on function public.user_is_assigned_vendor_for_event(uuid, uuid) from public;
grant execute on function public.user_is_assigned_vendor_for_event(uuid, uuid) to authenticated;

-- Helper 2: can the given user view a given event as a client?
create or replace function public.user_can_view_event_as_client(
  p_event_id uuid,
  p_user_id uuid
) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (
        e.client_id = p_user_id
        or exists (
          select 1 from public.invites i
          where i.event_id = e.id
            and i.client_user_id = p_user_id
            and i.accepted_at is not null
        )
      )
  );
$$;
revoke all on function public.user_can_view_event_as_client(uuid, uuid) from public;
grant execute on function public.user_can_view_event_as_client(uuid, uuid) to authenticated;

-- Helper 3: does the given vendor have a confirmed assignment to any 
-- event the given user can view as a client?
create or replace function public.user_can_view_vendor_via_confirmed_assignment(
  p_vendor_id uuid,
  p_user_id uuid
) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_vendors ev
    where ev.vendor_id = p_vendor_id
      and ev.status = 'confirmed'
      and public.user_can_view_event_as_client(ev.event_id, p_user_id)
  );
$$;
revoke all on function public.user_can_view_vendor_via_confirmed_assignment(uuid, uuid) from public;
grant execute on function public.user_can_view_vendor_via_confirmed_assignment(uuid, uuid) to authenticated;

-- Drop the events vendor-read policy (Phase 8.5C will re-add role-guarded).
drop policy if exists "events_select_assigned_vendor" on public.events;

-- Rewrite client-view policies using helpers (breaks recursion).
drop policy if exists "clients can view confirmed event vendors" on public.event_vendors;
create policy "clients can view confirmed event vendors"
  on public.event_vendors for select to authenticated
  using (
    status = 'confirmed'
    and public.user_can_view_event_as_client(event_id, auth.uid())
  );

drop policy if exists "clients can view vendors via confirmed assignments" on public.vendors;
create policy "clients can view vendors via confirmed assignments"
  on public.vendors for select to authenticated
  using (
    public.user_can_view_vendor_via_confirmed_assignment(id, auth.uid())
  );

drop policy if exists "clients can view accessible events" on public.events;
create policy "clients can view accessible events"
  on public.events for select to authenticated
  using (
    public.user_can_view_event_as_client(id, auth.uid())
  );
