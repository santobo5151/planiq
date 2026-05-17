-- Phase 9.5 prep #2: planner reads collaborator (client) profile names.
--
-- Adds two SECURITY DEFINER helpers and one SELECT policy on profiles
-- so that planners can see author.full_name for client-authored
-- comments. Mirrors the Phase 8.5C-2 pattern (vendor reads planner
-- profile) in the reverse direction.
--
-- Idempotent: create or replace for functions, drop if exists for policy.

-- (1) Helper: user_is_planner

create or replace function public.user_is_planner(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'planner'
  );
$$;

revoke all on function public.user_is_planner(uuid) from public;
grant execute on function public.user_is_planner(uuid) to authenticated;

-- (2) Helper: user_can_view_collaborator_profile_as_planner
--
-- Returns true when the requesting planner owns at least one event
-- linked to the target profile id, either as events.client_id directly
-- OR via an accepted invite. Uses events.planner_id OR events.created_by
-- for the planner-ownership check (matches the project convention).

create or replace function public.user_can_view_collaborator_profile_as_planner(
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
    from public.events e
    where (e.planner_id = p_user_id or e.created_by = p_user_id)
      and (
        e.client_id = p_profile_id
        or exists (
          select 1
          from public.invites i
          where i.event_id = e.id
            and i.client_user_id is not null
            and i.client_user_id = p_profile_id
            and i.accepted_at is not null
        )
      )
  );
$$;

revoke all on function public.user_can_view_collaborator_profile_as_planner(uuid, uuid) from public;
grant execute on function public.user_can_view_collaborator_profile_as_planner(uuid, uuid) to authenticated;

-- (3) Policy: profiles_select_collaborator_as_planner

drop policy if exists "profiles_select_collaborator_as_planner" on public.profiles;

create policy "profiles_select_collaborator_as_planner"
  on public.profiles
  for select
  to authenticated
  using (
    public.user_is_planner(auth.uid())
    and public.user_can_view_collaborator_profile_as_planner(profiles.id, auth.uid())
  );
