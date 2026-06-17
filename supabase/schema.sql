-- ============================================================
-- NEXTGEM VOLUNTEER PLATFORM - SUPABASE DATABASE SCHEMA
-- ============================================================
-- Run this SQL in the Supabase SQL Editor (Database -> SQL Editor)
-- to create all the tables needed for the volunteer platform.
--
-- Volunteer platform is now invite-only:
--   - Volunteers are NOT allowed to sign up themselves.
--   - NextGem staff (in the Internal Platform) create volunteer accounts
--     and assign each one a unique "NextGem code" (e.g. NG-2026-V-0042).
--   - Volunteers sign in with that code + password.
--   - Matrons are tied to one orphanage; they only manage that orphanage's QR.
--
-- QR codes rotate:
--   - Each orphanage has a current_qr_code and a qr_expires_at.
--   - Only NextGem admins can rotate them (typically monthly).
--   - Matrons download the current QR from /orphanage/qr.
--   - Once expired, the QR is rejected at scan time.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: orphanages
-- ============================================================
create table if not exists public.orphanages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  state text not null,
  city text,
  address text,
  matron_name text,
  matron_phone text,
  matron_email text,
  -- Currently-active QR token (encoded into the printed QR).
  -- Volunteers scan this; we look up the orphanage by this.
  -- The OLD QR codes are kept in qr_rotation_history for audit.
  current_qr_code text unique,
  -- When does the current QR expire? Once past this, scans reject.
  -- NULL means never expires (used for the sample orphanages).
  qr_expires_at timestamp with time zone,
  -- When was the QR last rotated, and by whom (auth.users.id).
  qr_rotated_at timestamp with time zone,
  qr_rotated_by uuid references auth.users(id),
  is_active boolean default true,
  verified boolean default false,
  -- Audit fields
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Backfill: if the legacy `qr_code` column exists, copy it into
-- current_qr_code (so upgrading from the old schema keeps things working).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orphanages'
      and column_name = 'qr_code'
  ) then
    update public.orphanages
      set current_qr_code = qr_code
    where current_qr_code is null and qr_code is not null;
  end if;
end $$;

-- ============================================================
-- TABLE: qr_rotation_history
-- ============================================================
-- Audit log of every QR rotation. Old QRs stay here so we can answer
-- "which QR was active last Tuesday" if needed.
create table if not exists public.qr_rotation_history (
  id uuid primary key default uuid_generate_v4(),
  orphanage_id uuid not null references public.orphanages(id) on delete cascade,
  -- The QR token that was active during this period.
  qr_code text not null,
  -- When did this rotation go into effect.
  effective_from timestamp with time zone not null default now(),
  -- When was this QR replaced by a newer one (NULL = still active).
  effective_to timestamp with time zone,
  -- Who rotated it.
  rotated_by uuid references auth.users(id),
  -- Optional note (e.g. "monthly rotation", "compromised").
  reason text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_qr_history_orphanage
  on public.qr_rotation_history(orphanage_id, effective_from desc);

-- ============================================================
-- TABLE: volunteers
-- ============================================================
-- Volunteers are created by NextGem staff only - never self-registered.
-- Each volunteer has a unique "NextGem code" (like a matriculation number).
--
-- Auth flow:
--   1. User enters their NextGem code (e.g. NG-2026-V-0042) + password.
--   2. We compute the synthetic auth_email = lower(code) + '@nextgem.volunteers'.
--   3. Supabase Auth signs them in using auth_email + password.
--   4. After auth, we look up volunteers.nextgem_code and load the profile.
create table if not exists public.volunteers (
  id uuid primary key default uuid_generate_v4(),
  -- Link to Supabase auth.users
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  -- NextGem code - the user-facing identifier. Format: NG-YYYY-V-NNNN
  nextgem_code text unique not null,
  -- Synthetic auth email derived from nextgem_code.
  -- We keep it stored (instead of computed) so RLS lookups are simpler.
  auth_email text unique not null,
  -- Optional contact email for notifications and password resets.
  contact_email text,
  phone text,
  -- Role on the volunteer platform.
  -- 'volunteer' = scans QR codes, earns hours/points
  -- 'matron'    = manages their orphanage's QR (one orphanage only)
  -- 'admin'     = NextGem staff (full access incl. QR rotation)
  role text not null default 'volunteer'
    check (role in ('volunteer', 'matron', 'admin')),
  -- Orphanage assignment (only meaningful for matrons).
  -- A matron is tied to ONE orphanage; they only see that orphanage's QR.
  assigned_orphanage_id uuid references public.orphanages(id) on delete set null,
  -- Total points earned from gamification (denormalized for fast leaderboard reads)
  total_points integer default 0,
  -- Total hours (denormalized)
  total_hours numeric default 0,
  -- When did the volunteer reach 100 hours (certificate trigger)
  certificate_issued_at timestamp with time zone,
  -- Is this user currently active? (deactivated users can't sign in)
  is_active boolean default true,
  -- Audit
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_volunteers_nextgem_code
  on public.volunteers(nextgem_code);
create index if not exists idx_volunteers_auth_email
  on public.volunteers(auth_email);
create index if not exists idx_volunteers_role
  on public.volunteers(role);
create index if not exists idx_volunteers_orphanage
  on public.volunteers(assigned_orphanage_id);

-- ============================================================
-- TABLE: check_ins
-- ============================================================
create table if not exists public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  orphanage_id uuid not null references public.orphanages(id) on delete cascade,
  -- Which QR was scanned. We record this so we can reject scans of expired QRs.
  scanned_qr_code text,
  type text not null check (type in ('in', 'out')),
  scanned_at timestamp with time zone default now(),
  notes text,
  -- Whether this has been synced to the Internal Operations Platform
  synced_to_internal boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_check_ins_volunteer_orphanage
  on public.check_ins(volunteer_id, orphanage_id, scanned_at desc);

-- ============================================================
-- TABLE: volunteer_hours
-- ============================================================
create table if not exists public.volunteer_hours (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  orphanage_id uuid not null references public.orphanages(id) on delete cascade,
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  check_out_id uuid references public.check_ins(id) on delete set null,
  hours numeric not null default 0,
  points_earned integer default 0,
  date date not null,
  synced_to_internal boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_volunteer_hours_volunteer
  on public.volunteer_hours(volunteer_id, date desc);

-- ============================================================
-- TABLE: badges
-- ============================================================
create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  milestone integer not null check (milestone in (10, 100, 1000)),
  badge_name text not null,
  awarded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique (volunteer_id, milestone)
);

-- ============================================================
-- TABLE: certificates
-- ============================================================
create table if not exists public.certificates (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  pdf_url text not null,
  emailed_at timestamp with time zone,
  whatsapp_sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- TABLE: flags
-- ============================================================
create table if not exists public.flags (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  orphanage_id uuid not null references public.orphanages(id) on delete cascade,
  flagged_by text not null,
  reason text not null,
  severity text default 'low' check (severity in ('low', 'medium', 'high')),
  resolved boolean default false,
  resolved_notes text,
  synced_to_internal boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- TABLE: audit_log
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_audit_log_created_at
  on public.audit_log(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- The Internal Platform uses the SERVICE ROLE key to write data here
-- (bypasses RLS). The volunteer platform uses the ANON key, so RLS
-- actually applies for volunteers and matrons.
--
-- Note: RLS for the volunteer platform is permissive (allow all) for
-- Phase 1. Tightening it is on the roadmap.

alter table public.orphanages enable row level security;
alter table public.qr_rotation_history enable row level security;
alter table public.volunteers enable row level security;
alter table public.check_ins enable row level security;
alter table public.volunteer_hours enable row level security;
alter table public.badges enable row level security;
alter table public.certificates enable row level security;
alter table public.flags enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "Allow all access for anon (Phase 1)" on public.orphanages;
create policy "Allow all access for anon (Phase 1)"
  on public.orphanages for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.qr_rotation_history;
create policy "Allow all access for anon (Phase 1)"
  on public.qr_rotation_history for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.volunteers;
create policy "Allow all access for anon (Phase 1)"
  on public.volunteers for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.check_ins;
create policy "Allow all access for anon (Phase 1)"
  on public.check_ins for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.volunteer_hours;
create policy "Allow all access for anon (Phase 1)"
  on public.volunteer_hours for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.badges;
create policy "Allow all access for anon (Phase 1)"
  on public.badges for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.certificates;
create policy "Allow all access for anon (Phase 1)"
  on public.certificates for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.flags;
create policy "Allow all access for anon (Phase 1)"
  on public.flags for all using (true) with check (true);

drop policy if exists "Allow all access for anon (Phase 1)" on public.audit_log;
create policy "Allow all access for anon (Phase 1)"
  on public.audit_log for all using (true) with check (true);

-- ============================================================
-- SEED DATA (Optional - delete after first test)
-- ============================================================
-- Sample orphanage so you can test QR scanning immediately.
-- Note: this row uses the legacy `qr_code` column if it exists; the
-- migration above copies it into current_qr_code.
do $$
begin
  if not exists (select 1 from public.orphanages limit 1) then
    insert into public.orphanages (
      name, state, city, address, matron_name, matron_phone,
      current_qr_code, verified
    ) values (
      'Sample Orphanage - Lagos',
      'Lagos',
      'Ikeja',
      '123 Test Street, Ikeja, Lagos',
      'Mrs. Test Matron',
      '+2348000000000',
      'NGSAMPLE-LAGOS-001',
      true
    );
  end if;
end $$;
