-- ============================================================
-- NEXTGEM VOLUNTEER PLATFORM - SUPABASE DATABASE SCHEMA
-- ============================================================
-- Run this SQL in the Supabase SQL Editor (Database -> SQL Editor)
-- to create all the tables needed for the volunteer platform.
--
-- This schema is intentionally simple. Every important table has:
--   - id (UUID primary key)
--   - created_at timestamp
--   - audit fields where relevant
--
-- Designed to work cleanly with the Internal Operations Platform.
-- ============================================================

-- Enable UUID generation (usually already enabled on Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: orphanages
-- ============================================================
-- Each partner orphanage has a record here.
-- The qr_code is a unique identifier that volunteers scan.
-- In production, the Internal Operations Platform will be the
-- source of truth for orphanages; the volunteer platform reads
-- from there. For now we maintain our own copy.
create table if not exists public.orphanages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  state text not null,
  city text,
  address text,
  matron_name text,
  matron_phone text,
  matron_email text,
  -- Unique QR token - this is what gets encoded into the QR code.
  -- Volunteers scan it and the platform looks up the orphanage by this.
  qr_code text unique not null,
  is_active boolean default true,
  verified boolean default false,
  -- Audit fields
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================
-- TABLE: volunteers
-- ============================================================
-- Volunteers who sign up to the platform.
-- The email is the login identifier; auth is handled by Supabase Auth.
create table if not exists public.volunteers (
  id uuid primary key default uuid_generate_v4(),
  -- Link to Supabase auth.users
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  phone text,
  -- Total points earned from gamification (denormalized for fast leaderboard reads)
  total_points integer default 0,
  -- Total hours (denormalized)
  total_hours numeric default 0,
  -- When did the volunteer reach 100 hours (certificate trigger)
  certificate_issued_at timestamp with time zone,
  -- Audit
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================
-- TABLE: check_ins
-- ============================================================
-- Every check-in and check-out event is logged here.
-- A volunteer has multiple check_ins records; pairs of check-in/check-out
-- rows are used to calculate hours.
-- type = 'in' for check-in, 'out' for check-out
create table if not exists public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  orphanage_id uuid not null references public.orphanages(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  -- Timestamp of the actual scan. Stored separately from created_at
  -- so we know when the volunteer actually scanned vs when we processed it.
  scanned_at timestamp with time zone default now(),
  -- Optional notes (e.g. matron override)
  notes text,
  -- Whether this has been synced to the Internal Operations Platform
  synced_to_internal boolean default false,
  -- Audit
  created_at timestamp with time zone default now()
);

-- Index for fast lookups of a volunteer's latest check-in at an orphanage
create index if not exists idx_check_ins_volunteer_orphanage
  on public.check_ins(volunteer_id, orphanage_id, scanned_at desc);

-- ============================================================
-- TABLE: volunteer_hours
-- ============================================================
-- Calculated hours per session (one row per check-in/check-out pair).
-- This is the source of truth for hours - kept denormalized for fast reads.
create table if not exists public.volunteer_hours (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  orphanage_id uuid not null references public.orphanages(id) on delete cascade,
  -- The check_in row that started this session
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  -- The check_out row that ended this session (may be null if still ongoing)
  check_out_id uuid references public.check_ins(id) on delete set null,
  hours numeric not null default 0,
  -- Points earned from this session (typically = hours * 10)
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
-- Badges awarded to volunteers at milestones (10, 100, 1000 hours).
-- One row per (volunteer, milestone).
create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  milestone integer not null check (milestone in (10, 100, 1000)),
  badge_name text not null,
  awarded_at timestamp with time zone default now(),
  -- Audit
  created_at timestamp with time zone default now(),
  unique (volunteer_id, milestone)
);

-- ============================================================
-- TABLE: certificates
-- ============================================================
-- Certificates auto-generated when a volunteer hits 100 hours.
-- Stores a link to the PDF in Supabase Storage.
create table if not exists public.certificates (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  -- Public URL to the PDF in Supabase Storage
  pdf_url text not null,
  -- Tracking delivery
  emailed_at timestamp with time zone,
  whatsapp_sent_at timestamp with time zone,
  -- Audit
  created_at timestamp with time zone default now()
);

-- ============================================================
-- TABLE: flags
-- ============================================================
-- Matrons can flag volunteers (e.g. for misconduct, no-show, etc.).
-- Flags are pushed to the Internal Operations Platform for review.
create table if not exists public.flags (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  orphanage_id uuid not null references public.orphanages(id) on delete cascade,
  flagged_by text not null, -- matron name or user_id
  reason text not null,
  severity text default 'low' check (severity in ('low', 'medium', 'high')),
  resolved boolean default false,
  resolved_notes text,
  -- Sync tracking
  synced_to_internal boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- TABLE: audit_log
-- ============================================================
-- Generic audit log for important actions.
-- Captures: who did what, when, and any relevant context.
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,        -- user_id of the person who performed the action
  actor_role text,      -- 'volunteer', 'matron', 'admin'
  action text not null, -- 'check_in', 'check_out', 'badge_awarded', 'flag_raised', etc.
  entity_type text,     -- 'volunteer', 'orphanage', 'check_in', etc.
  entity_id uuid,
  metadata jsonb,       -- any extra context (old value, new value, etc.)
  created_at timestamp with time zone default now()
);

create index if not exists idx_audit_log_created_at
  on public.audit_log(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS but keep policies permissive for Phase 1.
-- The Internal Operations Platform will be the security gate eventually.

alter table public.orphanages enable row level security;
alter table public.volunteers enable row level security;
alter table public.check_ins enable row level security;
alter table public.volunteer_hours enable row level security;
alter table public.badges enable row level security;
alter table public.certificates enable row level security;
alter table public.flags enable row level security;
alter table public.audit_log enable row level security;

-- For Phase 1: allow all reads/writes via anon role.
-- TODO for production: tighten these policies significantly.
-- We rely on the Internal Operations Platform for true role enforcement.
drop policy if exists "Allow all access for anon (Phase 1)" on public.orphanages;
create policy "Allow all access for anon (Phase 1)"
  on public.orphanages for all using (true) with check (true);

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
-- Insert a sample orphanage so you can test QR scanning immediately.

insert into public.orphanages (name, state, city, address, matron_name, matron_phone, qr_code, verified)
values (
  'Sample Orphanage - Lagos',
  'Lagos',
  'Ikeja',
  '123 Test Street, Ikeja, Lagos',
  'Mrs. Test Matron',
  '+2348000000000',
  'NGSAMPLE-LAGOS-001',
  true
)
on conflict (qr_code) do nothing;
