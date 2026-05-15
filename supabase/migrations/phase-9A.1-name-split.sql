-- Phase 9A.1 — split guest 'name' into 'first_name' and 'last_name'.
-- Required by the planner-side UI to support sorting, formatted email 
-- greetings, and CSV exports.
--
-- NOTE: this migration is destructive — it drops the existing 'name' 
-- column. In the original session, the table had one test row which was 
-- deleted first. For idempotent re-runs on a populated database, you'd 
-- need a backfill step (e.g. split on whitespace) before dropping name.

-- Defensive delete-then-migrate pattern. Use ONLY on dev/empty tables.
-- delete from public.guests;

alter table public.guests drop column if exists name;

alter table public.guests add column if not exists first_name text;
alter table public.guests add column if not exists last_name text;

-- Make them NOT NULL once any backfill is done. The original migration 
-- ran this after the table was empty so NOT NULL was safe immediately.
-- alter table public.guests alter column first_name set not null;
-- alter table public.guests alter column last_name set not null;
