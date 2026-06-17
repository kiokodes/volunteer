/**
 * TypeScript types matching the volunteer-platform Supabase schema.
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
  // Currently-active QR token (the one encoded in the printed QR).
  current_qr_code?: string | null;
  // When the current QR expires. NULL = never expires.
  qr_expires_at?: string | null;
  // When was the QR last rotated.
  qr_rotated_at?: string | null;
  is_active: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrRotation {
  id: string;
  orphanage_id: string;
  qr_code: string;
  effective_from: string;
  effective_to?: string | null;
  rotated_by?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface Volunteer {
  id: string;
  user_id?: string | null;
  full_name: string;
  // The NextGem code (matriculation-style identifier).
  nextgem_code: string;
  // Synthetic auth email. Computed from nextgem_code.
  auth_email: string;
  contact_email?: string | null;
  phone?: string | null;
  // Role on the platform.
  role: 'volunteer' | 'matron' | 'admin';
  // Orphanage assignment for matrons.
  assigned_orphanage_id?: string | null;
  total_points: number;
  total_hours: number;
  certificate_issued_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  volunteer_id: string;
  orphanage_id: string;
  scanned_qr_code?: string | null;
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
  date: string;
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

/**
 * View of the currently signed-in user, derived from
 * volunteers + auth metadata. Returned by getCurrentUser().
 */
export interface CurrentUser {
  // The volunteers row.
  volunteer: Volunteer;
  // Supabase auth metadata (email, etc).
  email: string;
}
