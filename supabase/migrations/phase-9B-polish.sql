-- Phase 9B polish — track when each RSVP invite was last sent so the 
-- planner can see per-guest send history and target bulk sends more 
-- precisely.

alter table public.guests
  add column if not exists rsvp_sent_at timestamptz;

-- Backfill: for guests with an existing rsvp_token (sent during testing 
-- before this migration), set rsvp_sent_at = created_at as best-effort.
-- Going forward, the send actions set this column accurately.
update public.guests
set rsvp_sent_at = created_at
where rsvp_token is not null
  and rsvp_sent_at is null;
