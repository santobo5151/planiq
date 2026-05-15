-- Phase 8 follow-up — allow clients to read planner profile names for events 
-- they have access to. Without this, the "Planned by [name]" line on the 
-- client dashboard falls back to "Your planner".
--
-- IMPORTANT: RLS controls rows, not columns. Application code must select 
-- only safe display fields (id, full_name, avatar_url) when reading planner 
-- profiles for client-facing views.

drop policy if exists "users can view collaborator planner profiles" on public.profiles;

create policy "users can view collaborator planner profiles"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.events e
      where 
        (e.planner_id = profiles.id or e.created_by = profiles.id)
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
