-- Phase 9.5 prep: client comments on plan/budget/checklist.
--
-- Creates plan_comments table with:
--   - Self-referential parent_comment_id (ON DELETE CASCADE so replies
--     follow when a parent is deleted).
--   - Surface CHECK: plan | budget | checklist.
--   - resolved_at + resolved_by for audit. Queries use
--     resolved_at IS NOT NULL as the "is resolved" boolean.
--   - No updated_at — comments are immutable after posting.
--
-- Triggers:
--   - validate_plan_comment_parent: ensures parent (if any) belongs
--     to the same event AND is itself not a reply (one-level cap).
--   - prevent_plan_comment_immutable_updates: blocks updates to
--     event_id, surface, anchor, content, author_id, parent_comment_id.
--     Only resolved_at + resolved_by may change after insert.
--
-- RLS policies (per-operation; no ALL policy for planners so DB
-- prohibits planner DELETE):
--   - Planner SELECT/INSERT/UPDATE for events they own
--     (planner_id OR created_by). NO planner DELETE policy.
--   - Client SELECT via user_can_view_event_as_client helper.
--   - Client INSERT where author_id = auth.uid() AND event is viewable.
--   - Client DELETE where author_id = auth.uid() AND event is still
--     viewable as client (so revoked clients lose delete capability).
--
-- Idempotent.

-- (0) Ensure pgcrypto for gen_random_uuid()

create extension if not exists pgcrypto;

-- (1) Table

create table if not exists public.plan_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  surface text not null,
  anchor text,
  content text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.plan_comments(id) on delete cascade,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  constraint plan_comments_surface_check
    check (surface in ('plan', 'budget', 'checklist')),

  constraint plan_comments_content_not_empty
    check (length(trim(content)) > 0),

  constraint plan_comments_anchor_length
    check (anchor is null or length(anchor) <= 100),

  constraint plan_comments_content_length
    check (length(content) <= 2000),

  constraint plan_comments_resolved_pair
    check (
      (resolved_at is null and resolved_by is null) or
      (resolved_at is not null and resolved_by is not null)
    )
);

-- (2) Indexes

create index if not exists plan_comments_event_id_idx
  on public.plan_comments (event_id);

create index if not exists plan_comments_parent_comment_id_idx
  on public.plan_comments (parent_comment_id)
  where parent_comment_id is not null;

create index if not exists plan_comments_author_id_idx
  on public.plan_comments (author_id);

create index if not exists plan_comments_event_unresolved_idx
  on public.plan_comments (event_id, created_at)
  where resolved_at is null;

create index if not exists plan_comments_event_surface_idx
  on public.plan_comments (event_id, surface, created_at);

-- (3) Trigger: validate_plan_comment_parent
--
-- Enforces two invariants on INSERT and UPDATE:
--   (a) parent (if any) must belong to the same event.
--   (b) parent (if any) must itself be a top-level comment
--       (parent.parent_comment_id IS NULL). This caps thread depth at 1.

create or replace function public.validate_plan_comment_parent()
returns trigger
language plpgsql
as $$
declare
  parent_event_id uuid;
  parent_parent_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select event_id, parent_comment_id
    into parent_event_id, parent_parent_id
  from public.plan_comments
  where id = new.parent_comment_id;

  if parent_event_id is null then
    raise exception 'Parent comment not found';
  end if;

  if parent_event_id <> new.event_id then
    raise exception 'Parent comment must belong to the same event';
  end if;

  if parent_parent_id is not null then
    raise exception 'Replies cannot have replies';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_plan_comment_parent_trigger on public.plan_comments;
create trigger validate_plan_comment_parent_trigger
  before insert or update on public.plan_comments
  for each row execute procedure public.validate_plan_comment_parent();

-- (4) Trigger: prevent_plan_comment_immutable_updates
--
-- Allows resolved_at + resolved_by to change after insert; blocks
-- changes to all other content/metadata columns. Enforces the
-- "comments are immutable after posting" rule at the DB layer.

create or replace function public.prevent_plan_comment_immutable_updates()
returns trigger
language plpgsql
as $$
begin
  if new.event_id is distinct from old.event_id
     or new.surface is distinct from old.surface
     or new.anchor is distinct from old.anchor
     or new.content is distinct from old.content
     or new.author_id is distinct from old.author_id
     or new.parent_comment_id is distinct from old.parent_comment_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Plan comments are immutable after posting';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_plan_comment_immutable_updates_trigger on public.plan_comments;
create trigger prevent_plan_comment_immutable_updates_trigger
  before update on public.plan_comments
  for each row execute procedure public.prevent_plan_comment_immutable_updates();

-- (5) Enable RLS

alter table public.plan_comments enable row level security;

-- (6) Policies — per-operation, no planner DELETE

-- Planner SELECT
drop policy if exists "plan_comments_planner_select" on public.plan_comments;
create policy "plan_comments_planner_select"
  on public.plan_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = plan_comments.event_id
        and (e.planner_id = auth.uid() or e.created_by = auth.uid())
    )
  );

-- Planner INSERT (e.g. posting a reply). author_id must be self.
drop policy if exists "plan_comments_planner_insert" on public.plan_comments;
create policy "plan_comments_planner_insert"
  on public.plan_comments
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.events e
      where e.id = plan_comments.event_id
        and (e.planner_id = auth.uid() or e.created_by = auth.uid())
    )
  );

-- Planner UPDATE (e.g. resolving). Immutability trigger blocks
-- content/metadata changes; only resolved_at + resolved_by can change.
drop policy if exists "plan_comments_planner_update" on public.plan_comments;
create policy "plan_comments_planner_update"
  on public.plan_comments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = plan_comments.event_id
        and (e.planner_id = auth.uid() or e.created_by = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.events e
      where e.id = plan_comments.event_id
        and (e.planner_id = auth.uid() or e.created_by = auth.uid())
    )
  );

-- NO planner DELETE policy. DB prohibits planner deletes.

-- Client SELECT
drop policy if exists "plan_comments_client_select" on public.plan_comments;
create policy "plan_comments_client_select"
  on public.plan_comments
  for select
  to authenticated
  using (
    public.user_can_view_event_as_client(plan_comments.event_id, auth.uid())
  );

-- Client INSERT (own comments on accessible events)
drop policy if exists "plan_comments_client_insert" on public.plan_comments;
create policy "plan_comments_client_insert"
  on public.plan_comments
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.user_can_view_event_as_client(plan_comments.event_id, auth.uid())
  );

-- Client DELETE (own comments, only while still viewing event)
drop policy if exists "plan_comments_client_delete" on public.plan_comments;
create policy "plan_comments_client_delete"
  on public.plan_comments
  for delete
  to authenticated
  using (
    author_id = auth.uid()
    and public.user_can_view_event_as_client(plan_comments.event_id, auth.uid())
  );
