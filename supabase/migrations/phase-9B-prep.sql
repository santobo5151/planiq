-- Phase 9B prep — add columns for RSVP email flow.
-- Schema only. No public RLS policies — the /rsvp/[token] page and 
-- RSVP submit action use the admin Supabase client server-side, matching 
-- the Phase 8A invite token pattern.

alter table public.guests
  add column if not exists rsvp_token text,
  add column if not exists plus_one_allowed boolean not null default false,
  add column if not exists rsvp_responded_at timestamptz;

create unique index if not exists guests_rsvp_token_unique 
  on public.guests (rsvp_token)
  where rsvp_token is not null;

alter table public.events
  add column if not exists rsvp_deadline timestamptz;
