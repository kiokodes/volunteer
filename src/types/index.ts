/**
 * types/index.ts
 *
 * Shared TypeScript types used across the entire Volunteer Platform.
 * Keep all database-level types here so they stay in sync with the Supabase schema.
 */

// ─── User / Auth ─────────────────────────────────────────────────────────────

export type UserRole = "volunteer" | "matron" | "admin";

export interface Profile {
  id: string;           // matches auth.users.id
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

// ─── Orphanage ────────────────────────────────────────────────────────────────

export interface Orphanage {
  id: string;
  name: string;
  state: string;
  address: string;
  matron_id: string;   // profile.id of the assigned matron
  qr_code_token: string; // unique token embedded in the QR code URL
  is_active: boolean;
  created_at: string;
}

// ─── Check-in / Check-out ────────────────────────────────────────────────────

export type CheckStatus = "checked_in" | "checked_out";

export interface CheckRecord {
  id: string;
  volunteer_id: string;       // profile.id
  orphanage_id: string;
  check_in_time: string;      // ISO timestamp
  check_out_time: string | null;
  hours_worked: number | null; // calculated on checkout
  synced_to_internal: boolean; // true once pushed to Internal Ops Platform
  created_at: string;
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export type BadgeTier = "none" | "basic" | "intermediate" | "advanced";

export interface VolunteerStats {
  volunteer_id: string;
  total_hours: number;
  total_points: number;
  badge_tier: BadgeTier;
  certificate_issued: boolean;
  certificate_issued_at: string | null;
}

// Milestone definitions — single source of truth for badge logic
export const MILESTONES = [
  { hours: 10,   tier: "basic"        as BadgeTier, label: "First Steps",    points: 100  },
  { hours: 100,  tier: "intermediate" as BadgeTier, label: "Dedicated",      points: 1000 },
  { hours: 1000, tier: "advanced"     as BadgeTier, label: "Champion",       points: 10000},
] as const;

// Points per hour volunteered
export const POINTS_PER_HOUR = 10;

// ─── Volunteer Flags ──────────────────────────────────────────────────────────

export interface VolunteerFlag {
  id: string;
  volunteer_id: string;
  orphanage_id: string;
  matron_id: string;
  reason: string;
  created_at: string;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  volunteer_id: string;
  full_name: string;
  total_hours: number;
  total_points: number;
  badge_tier: BadgeTier;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
