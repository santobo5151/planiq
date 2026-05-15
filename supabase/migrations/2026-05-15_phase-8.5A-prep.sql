-- Phase 8.5A prep
-- 1. Allow 'vendor' role on profiles (still nullable until onboarding).
-- 2. Create vendor_users table (separate from planner-owned vendors directory).
-- 3. Add invite-tracking columns to event_vendors.
-- 4. RLS policies for vendor self-access on their assignments + assigned events.

-- 1. Profiles role: add 'vendor', explicit null allowance
alter table public.profiles 
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('planner', 'client', 'vendor'));

-- 2. updated_at helper (idempotent, defensive)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3. vendor_users table
create table if not exists public.vendor_users (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  contact_name text,
  category text,
  phone text,
  location text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_vendor_users_updated_at on public.vendor_users;
create trigger update_vendor_users_updated_at
  before update on public.vendor_users
  for each row execute procedure public.update_updated_at_column();

alter table public.vendor_users enable row level security;

drop policy if exists "vendor_users_select_own" on public.vendor_users;
create policy "vendor_users_select_own"
  on public.vendor_users for select to authenticated
  using (id = auth.uid());

drop policy if exists "vendor_users_insert_own" on public.vendor_users;
create policy "vendor_users_insert_own"
  on public.vendor_users for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "vendor_users_update_own" on public.vendor_users;
create policy "vendor_users_update_own"
  on public.vendor_users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 4. event_vendors: invite-tracking columns
alter table public.event_vendors
  add column if not exists invite_token text,
  add column if not exists vendor_user_id uuid references auth.users(id),
  add column if not exists responded_at timestamptz;

create unique index if not exists event_vendors_invite_token_unique
  on public.event_vendors (invite_token) where invite_token is not null;

-- 5. event_vendors RLS: vendor self-access (status/responded_at only enforced in app code)
drop policy if exists "event_vendors_select_assigned_vendor" on public.event_vendors;
create policy "event_vendors_select_assigned_vendor"
  on public.event_vendors for select to authenticated
  using (vendor_user_id = auth.uid());

drop policy if exists "event_vendors_update_assigned_vendor" on public.event_vendors;
create policy "event_vendors_update_assigned_vendor"
  on public.event_vendors for update to authenticated
  using (vendor_user_id = auth.uid())
  with check (vendor_user_id = auth.uid());

-- 6. events: vendor read access — NOTE: this policy was added and then 
--    DROPPED later in this session due to RLS recursion when planners 
--    insert into event_vendors. Phase 8.5C will re-add a role-guarded 
--    version. See 2026-05-15_phase-8.5A-rls-fixes.sql.
