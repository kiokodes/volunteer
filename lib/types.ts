/**
 * Shared TypeScript types for the NextGem Volunteer Platform.
 * These mirror the Supabase schema (see supabase/schema.sql).
 *
 * Keeping them in one place makes it easy to refactor later when we
 * sync with the Internal Operations Platform.
 */

export interface Orphanage {
  id: string;
  name: string;
  state: string;
  city?: string | null;
  address?: string | null;
  matron_name?: string | null;
  matron_phone?: string | null;
  matron_email?: string | null;
  qr_code: string;
  is_active: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Volunteer {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  total_points: number;
  total_hours: number;
  certificate_issued_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  volunteer_id: string;
  orphanage_id: string;
  type: 'in' | 'out';
  scanned_at: string;
  notes?: string | null;
  synced_to_internal: boolean;
  created_at: string;
}

export interface VolunteerHour {
  id: string;
  volunteer_id: string;
  orphanage_id: string;
  check_in_id: string;
  check_out_id?: string | null;
  hours: number;
  points_earned: number;
  date: string; // ISO date e.g. '2026-06-16'
  synced_to_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  volunteer_id: string;
  milestone: 10 | 100 | 1000;
  badge_name: string;
  awarded_at: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  volunteer_id: string;
  pdf_url: string;
  emailed_at?: string | null;
  whatsapp_sent_at?: string | null;
  created_at: string;
}

export interface Flag {
  id: string;
  volunteer_id: string;
  orphanage_id: string;
  flagged_by: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  resolved_notes?: string | null;
  synced_to_internal: boolean;
  created_at: string;
}
