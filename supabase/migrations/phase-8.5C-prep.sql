-- Phase 8.5C prep:
--   (1) Add SECURITY DEFINER helper user_is_vendor(p_user_id uuid).
--   (2) Re-add events_select_assigned_vendor policy, using two
--       SECURITY DEFINER helpers (user_is_vendor + the existing
--       user_is_assigned_vendor_for_event from Phase 8.5A RLS fixes).
--
-- Both helpers are SECURITY DEFINER so neither re-enters the RLS
-- policy graph during evaluation. The role check exists for
-- correctness (scope this branch to vendors only); recursion safety
-- comes from the helpers themselves, not from evaluation order.
--
-- Idempotent: create or replace for the function, drop if exists
-- for the policy.

-- (1) Helper: user_is_vendor

create or replace function public.user_is_vendor(p_user_id uuid)
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
      and p.role = 'vendor'
  );
$$;

revoke all on function public.user_is_vendor(uuid) from public;
grant execute on function public.user_is_vendor(uuid) to authenticated;

-- (2) Policy: events_select_assigned_vendor

drop policy if exists "events_select_assigned_vendor" on public.events;

create policy "events_select_assigned_vendor"
  on public.events
  for select
  to authenticated
  using (
    public.user_is_vendor(auth.uid())
    and public.user_is_assigned_vendor_for_event(events.id, auth.uid())
  );
