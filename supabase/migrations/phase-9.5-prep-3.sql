-- phase-9.5-prep-3.sql
-- Extends validate_plan_comment_parent to atomically reject replies to
-- resolved parents. Closes the application-level race window where a
-- planner could reply between the resolve happening and the reply insert
-- completing. CREATE OR REPLACE keeps the existing trigger binding.

create or replace function public.validate_plan_comment_parent()
returns trigger
language plpgsql
as $$
declare
  parent_event_id uuid;
  parent_parent_id uuid;
  parent_resolved_at timestamptz;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select event_id, parent_comment_id, resolved_at
    into parent_event_id, parent_parent_id, parent_resolved_at
    from public.plan_comments
    where id = new.parent_comment_id;

  if not found then
    raise exception 'Parent comment % does not exist', new.parent_comment_id;
  end if;

  if parent_event_id is distinct from new.event_id then
    raise exception 'Parent comment belongs to a different event';
  end if;

  if parent_parent_id is not null then
    raise exception 'Replies cannot have replies (parent must be top-level)';
  end if;

  if parent_resolved_at is not null then
    raise exception 'Cannot reply to a resolved comment';
  end if;

  return new;
end;
$$;
