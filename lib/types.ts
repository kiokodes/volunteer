export interface Orphanage {
  id: string;
  name: string;
  qr_code_token: string;
  created_at: string;
}

export interface Volunteer {
  id: string;
  name: string;
  nysc_code: string;
  orphanage_id: string;
  created_at: string;
}

export interface Session {
  id: string;
  volunteer_id: string;
  orphanage_id: string;
  date: string;
  check_in_time: string;
  check_out_time: string | null;
  hours_worked: number | null;
  created_at: string;
}

export interface VolunteerWithStatus extends Volunteer {
  has_open_session: boolean;
  current_session?: Session;
}

export interface OrphanageWithVolunteers extends Orphanage {
  volunteers: VolunteerWithStatus[];
}

export interface DashboardStats {
  total_orphanages: number;
  total_volunteers: number;
  total_hours: number;
  flagged_sessions: FlaggedSession[];
  orphanages: OrphanageStats[];
  volunteers: VolunteerStats[];
}

export interface FlaggedSession {
  id: string;
  volunteer_name: string;
  orphanage_name: string;
  check_in_time: string;
  hours_open: number;
}

export interface OrphanageStats {
  id: string;
  name: string;
  volunteer_count: number;
  total_hours: number;
}

export interface VolunteerStats {
  id: string;
  name: string;
  nysc_code: string;
  orphanage_name: string;
  total_sessions: number;
  total_hours: number;
}

export interface CheckInResponse {
  success: boolean;
  session?: Session;
  error?: string;
}

export interface CheckOutResponse {
  success: boolean;
  session?: Session;
  error?: string;
}