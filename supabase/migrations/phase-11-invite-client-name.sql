-- Phase 11: optional planner-provided client name on invites.
-- Copied to profiles.full_name on acceptance, only if full_name is null/empty.

alter table public.invites
  add column if not exists client_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invites_client_name_trimmed_length'
  ) then
    alter table public.invites
      add constraint invites_client_name_trimmed_length
      check (
        client_name is null
        or (
          client_name = btrim(client_name)
          and char_length(client_name) between 1 and 100
        )
      );
  end if;
end $$;

notify pgrst, 'reload schema';
