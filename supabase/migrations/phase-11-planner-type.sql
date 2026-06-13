alter table public.profiles
  add column if not exists planner_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_planner_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_planner_type_check
      check (planner_type is null or planner_type in ('professional','self'));
  end if;
end $$;

notify pgrst, 'reload schema';
