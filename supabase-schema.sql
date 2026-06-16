-- ============================================================
-- NextGem Volunteer Platform — Supabase Database Schema
-- Version: 1.0  |  June 2026
--
-- HOW TO USE:
-- 1. Open your Supabase project dashboard
-- 2. Go to the SQL Editor
-- 3. Paste this entire file and click "Run"
-- 4. All tables, policies, and triggers will be created
-- ============================================================


-- ── 1. PROFILES ─────────────────────────────────────────────────────────────
-- One profile per user (linked to auth.users via the id field).
-- Created automatically when a volunteer registers, or manually by an admin.

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'volunteer'
                  CHECK (role IN ('volunteer', 'matron', 'admin')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow users to read their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ── 2. ORPHANAGES ────────────────────────────────────────────────────────────
-- Each registered orphanage has a unique QR token used for check-in/out.

CREATE TABLE IF NOT EXISTS orphanages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  state            TEXT NOT NULL,
  address          TEXT NOT NULL,
  matron_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  qr_code_token    TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orphanages ENABLE ROW LEVEL SECURITY;

-- Volunteers can view active orphanages (so QR scan can look up the orphanage)
CREATE POLICY "Anyone authenticated can view active orphanages"
  ON orphanages FOR SELECT
  USING (is_active = TRUE AND auth.uid() IS NOT NULL);

-- Admins can manage orphanages
CREATE POLICY "Admins can manage orphanages"
  ON orphanages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ── 3. CHECK RECORDS ─────────────────────────────────────────────────────────
-- Every time a volunteer checks in or checks out, a row is created here.

CREATE TABLE IF NOT EXISTS check_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  orphanage_id          UUID NOT NULL REFERENCES orphanages(id) ON DELETE CASCADE,
  check_in_time         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time        TIMESTAMPTZ,                          -- NULL = still checked in
  hours_worked          NUMERIC(6, 2),                        -- calculated on checkout
  synced_to_internal    BOOLEAN NOT NULL DEFAULT FALSE,       -- TRUE once sent to Internal Platform
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE check_records ENABLE ROW LEVEL SECURITY;

-- Volunteers can only see their own records
CREATE POLICY "Volunteers can view their own check records"
  ON check_records FOR SELECT
  USING (volunteer_id = auth.uid());

-- Volunteers can insert their own check records
CREATE POLICY "Volunteers can insert their own check records"
  ON check_records FOR INSERT
  WITH CHECK (volunteer_id = auth.uid());

-- Volunteers can update their own records (needed to add check_out_time)
CREATE POLICY "Volunteers can update their own check records"
  ON check_records FOR UPDATE
  USING (volunteer_id = auth.uid());

-- Matrons can view check records for their orphanage
CREATE POLICY "Matrons can view check records for their orphanage"
  ON check_records FOR SELECT
  USING (
    orphanage_id IN (
      SELECT id FROM orphanages WHERE matron_id = auth.uid()
    )
  );

-- Admins can view all check records
CREATE POLICY "Admins can view all check records"
  ON check_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ── 4. VOLUNTEER STATS ───────────────────────────────────────────────────────
-- Aggregated stats per volunteer. Updated on each check-out.
-- This avoids re-calculating totals from check_records on every dashboard load.

CREATE TABLE IF NOT EXISTS volunteer_stats (
  volunteer_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_hours            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_points           INTEGER NOT NULL DEFAULT 0,
  badge_tier             TEXT NOT NULL DEFAULT 'none'
                           CHECK (badge_tier IN ('none', 'basic', 'intermediate', 'advanced')),
  certificate_issued     BOOLEAN NOT NULL DEFAULT FALSE,
  certificate_issued_at  TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE volunteer_stats ENABLE ROW LEVEL SECURITY;

-- Volunteers can view their own stats
CREATE POLICY "Volunteers can view their own stats"
  ON volunteer_stats FOR SELECT
  USING (volunteer_id = auth.uid());

-- Volunteers can upsert their own stats (done on checkout)
CREATE POLICY "Volunteers can upsert their own stats"
  ON volunteer_stats FOR ALL
  USING (volunteer_id = auth.uid());

-- Anyone authenticated can view stats for leaderboard
CREATE POLICY "Authenticated users can view all stats for leaderboard"
  ON volunteer_stats FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ── 5. VOLUNTEER FLAGS ───────────────────────────────────────────────────────
-- Matrons raise flags on volunteers. Reviewed by admins.

CREATE TABLE IF NOT EXISTS volunteer_flags (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  orphanage_id   UUID NOT NULL REFERENCES orphanages(id) ON DELETE CASCADE,
  matron_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  reviewed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE volunteer_flags ENABLE ROW LEVEL SECURITY;

-- Matrons can insert and view flags for their orphanage
CREATE POLICY "Matrons can manage flags for their orphanage"
  ON volunteer_flags FOR ALL
  USING (matron_id = auth.uid());

-- Admins can view all flags
CREATE POLICY "Admins can view all flags"
  ON volunteer_flags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ── 6. INDEXES (performance) ─────────────────────────────────────────────────
-- Speed up common queries

CREATE INDEX IF NOT EXISTS idx_check_records_volunteer  ON check_records(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_check_records_orphanage  ON check_records(orphanage_id);
CREATE INDEX IF NOT EXISTS idx_check_records_checkin    ON check_records(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_check_records_unsynced   ON check_records(synced_to_internal) WHERE synced_to_internal = FALSE;
CREATE INDEX IF NOT EXISTS idx_orphanages_matron        ON orphanages(matron_id);
CREATE INDEX IF NOT EXISTS idx_stats_hours              ON volunteer_stats(total_hours DESC);
CREATE INDEX IF NOT EXISTS idx_flags_volunteer          ON volunteer_flags(volunteer_id);


-- ── Done! ─────────────────────────────────────────────────────────────────────
-- After running this script:
-- 1. Copy your Supabase URL and Anon Key into .env.local
-- 2. Run: npm install && npm run dev
