-- Phase 8.5C prep #2: vendor reads planner profile name for assigned events.
--
-- Adds a SECURITY DEFINER helper user_can_view_planner_profile_as_vendor
-- that resolves to true when the vendor is assigned to at least one event
-- whose planner_id OR created_by equals the target profile id.
--
-- Adds a SELECT policy on public.profiles named
-- profiles_select_planner_as_vendor that uses the new helper plus the
-- existing user_is_vendor role guard.
--
-- Idempotent: create or replace for the function, drop if exists
-- for the policy.

-- (1) Helper: user_can_view_planner_profile_as_vendor

create or replace function public.user_can_view_planner_profile_as_vendor(
  p_profile_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.event_vendors ev
    join public.events e on e.id = ev.event_id
    where ev.vendor_user_id is not null
      and ev.vendor_user_id = p_user_id
      and (e.planner_id = p_profile_id or e.created_by = p_profile_id)
  );
$$;

revoke all on function public.user_can_view_planner_profile_as_vendor(uuid, uuid) from public;
grant execute on function public.user_can_view_planner_profile_as_vendor(uuid, uuid) to authenticated;

-- (2) Policy: profiles_select_planner_as_vendor

drop policy if exists "profiles_select_planner_as_vendor" on public.profiles;

create policy "profiles_select_planner_as_vendor"
  on public.profiles
  for select
  to authenticated
  using (
    public.user_is_vendor(auth.uid())
    and public.user_can_view_planner_profile_as_vendor(profiles.id, auth.uid())
  );
