-- Phase 10B prep: newsletter_subscribers table for landing-page capture.
--
-- Public landing-page visitors submit their email via the /v2 footer form.
-- This is the app's FIRST unauthenticated write path. Security posture:
--   - The table is RLS-enabled with ZERO policies. This is DELIBERATE, not
--     an oversight. No anon/authenticated role can read or write it directly.
--   - Base-table privileges are also revoked from anon/authenticated, so the
--     table is sealed at BOTH the RLS layer and the grant layer.
--   - The ONLY writer is a server action using the service-role (admin)
--     client, which bypasses RLS and grants. The action validates with Zod.
--   - Do NOT add a public INSERT policy "to make it work" — that would open
--     an unauthenticated write endpoint on the anon key. The sealed-table +
--     admin-action pattern is the intended design.
--
-- Email is stored lower-cased and trimmed (normalised in the action). A
-- CHECK enforces lowercase at the DB layer; a case-insensitive unique index
-- prevents duplicate subscriptions across casing. Re-subscribing is treated
-- as success by the action (friendly), so a unique-violation on insert is
-- expected and handled, not an error.
--
-- No email send here. Resend confirmation/Audiences is deferred to Phase 10C.
--
-- Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'v2_footer',
  created_at timestamptz not null default now(),

  constraint newsletter_subscribers_email_not_empty
    check (length(trim(email)) > 0),

  constraint newsletter_subscribers_email_length
    check (length(email) <= 254),

  constraint newsletter_subscribers_email_lowercase
    check (email = lower(email)),

  constraint newsletter_subscribers_email_format
    check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),

  constraint newsletter_subscribers_source_length
    check (length(source) <= 50)
);

create unique index if not exists newsletter_subscribers_email_lower_idx
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

-- Seal at the grant layer too. Service-role/admin client bypasses both
-- RLS and these grants, so the server action still writes successfully.
revoke all on table public.newsletter_subscribers from anon;
revoke all on table public.newsletter_subscribers from authenticated;
