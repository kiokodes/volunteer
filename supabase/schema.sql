-- NextGem Volunteer Check-In System
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orphanages table
CREATE TABLE IF NOT EXISTS orphanages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  qr_code_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nysc_code TEXT NOT NULL,
  orphanage_id UUID REFERENCES orphanages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
  orphanage_id UUID REFERENCES orphanages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  hours_worked NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(volunteer_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orphanages_token ON orphanages(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_volunteers_orphanage ON volunteers(orphanage_id);
CREATE INDEX IF NOT EXISTS idx_sessions_volunteer ON sessions(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_open ON sessions(volunteer_id) WHERE check_out_time IS NULL;

-- Row Level Security (RLS)
ALTER TABLE orphanages ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read orphanages" ON orphanages FOR SELECT USING (true);
CREATE POLICY "Public read volunteers" ON volunteers FOR SELECT USING (true);
CREATE POLICY "Public read sessions" ON sessions FOR SELECT USING (true);

-- Insert access for sessions (for check-in/check-out)
CREATE POLICY "Public insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update sessions" ON sessions FOR UPDATE USING (true);