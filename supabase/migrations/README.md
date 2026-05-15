# PlanIQ SQL migrations

These files document the SQL changes made to the PlanIQ Supabase database, 
phase by phase. They were retrofitted to the repo after Phase 8.5A — the 
project originally ran SQL directly in the Supabase SQL Editor.

## Conventions

- **Filenames:** `phase-X-<short-description>.sql` matching the phase 
  number used in commit messages and conversation history.
- **Idempotent:** every migration uses `if not exists`, `drop if exists`, 
  `create or replace`, or equivalent so they're safe to re-run.
- **Phase 0–2 baseline NOT included.** The original schema setup pre-dates 
  this folder. Use `supabase db dump` (Supabase CLI) to capture the live 
  schema if doing a full rebuild.

## Order of application

For a fresh database rebuild, apply in this order:
1. (Baseline — recreate from `supabase db dump` or your original setup)
2. phase-8-prep.sql
3. phase-8-profile-rls.sql
4. phase-9A-prep.sql
5. phase-9A.1-name-split.sql (requires guests table to be empty — see file)
6. phase-9B-prep.sql
7. phase-9B-polish.sql
8. phase-8.5A-prep.sql
9. phase-8.5A-rls-fixes.sql (REQUIRED — without this, planners hit 
   "infinite recursion" errors when assigning vendors)

## Going forward

Future phases should:
1. Write the SQL into a new file in this folder BEFORE running it in 
   Supabase.
2. Run from the file in the Supabase SQL Editor (paste contents).
3. Commit the file as part of the phase commit.
