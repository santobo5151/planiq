-- Phase 10J: add planner business name to profiles.
-- Collaborator-facing planner identity where available.
-- Nullable because self-planners legitimately have no business name.

alter table public.profiles
  add column if not exists business_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_business_name_trimmed_length'
  ) then
    alter table public.profiles
      add constraint profiles_business_name_trimmed_length
      check (
        business_name is null
        or (
          business_name = btrim(business_name)
          and char_length(business_name) between 1 and 100
        )
      );
  end if;
end $$;
