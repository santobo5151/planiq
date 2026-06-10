-- Phase 11: auto-create-profile trigger on auth.users.
-- Lives on auth.users, so a --schema=public dump misses it.
-- Required: without it, new signups create an auth user but no profiles row
-- ("profile missing" error on first login). Function handle_new_user() already
-- exists in public; this binds it to auth.users INSERT.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
  begin
    insert into public.profiles (id, full_name, avatar_url)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
    return new;
  end;
  $function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
