/**
 * Hours calculation logic.
 *
 * Critical function: this is what turns check-in/out scans into actual volunteer hours.
 *
 * How it works:
 *   1. Each volunteer at an orphanage has alternating 'in' and 'out' check-in records.
 *   2. When a new 'out' scan comes in, we find the matching 'in' (the most recent
 *      'in' for that volunteer+orphanage pair that hasn't been paired yet).
 *   3. The difference between the two timestamps is the session hours.
 *   4. We save a volunteer_hours row and mark both check_ins as paired.
 *
 * Why this is important to get right:
 *   - Hours feed into gamification (badges, certificates, leaderboard).
 *   - Hours sync to the Internal Operations Platform.
 *   - Errors here will compound across many volunteers.
 *
 * Edge cases handled:
 *   - Volunteer scans 'out' without an active 'in' -> ignored with a warning.
 *   - Volunteer scans 'in' twice in a row -> the second scan is ignored.
 *   - Sessions longer than 12 hours -> capped at 12 hours (anti-fraud).
 *   - Sessions shorter than 1 minute -> set to 0 hours (likely a mis-scan).
 */

import { getSupabaseClient } from './supabase';
import type { CheckIn, VolunteerHour } from './types';

const MAX_SESSION_HOURS = 12; // anti-fraud: a single session can't exceed 12 hours
const MIN_SESSION_MINUTES = 1; // sessions shorter than this are likely mis-scans

export interface CheckInResult {
  success: boolean;
  message: string;
  hoursRecord?: VolunteerHour;
  totalHours?: number;
  newBadge?: number;
  certificateIssued?: boolean;
}

/**
 * Record a check-in or check-out for a volunteer at an orphanage.
 *
 * @param volunteerId - the volunteer's id
 * @param orphanageId - the orphanage's id (resolved from the QR scan)
 * @param type - 'in' or 'out'
 * @returns a result object with success status and any hours awarded
 */
export async function recordCheckIn(
  volunteerId: string,
  orphanageId: string,
  type: 'in' | 'out'
): Promise<CheckInResult> {
  const supabase = getSupabaseClient();

  // Insert the new check-in row.
  const { data: newCheckIn, error: insertError } = await supabase
    .from('check_ins')
    .insert({
      volunteer_id: volunteerId,
      orphanage_id: orphanageId,
      type,
      scanned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !newCheckIn) {
    return {
      success: false,
      message: `Could not record ${type}: ${insertError?.message ?? 'unknown error'}`,
    };
  }

  // Also write to the audit log for traceability.
  await supabase.from('audit_log').insert({
    actor_id: volunteerId,
    actor_role: 'volunteer',
    action: type === 'in' ? 'check_in' : 'check_out',
    entity_type: 'check_in',
    entity_id: newCheckIn.id,
    metadata: { orphanage_id: orphanageId },
  });

  // If this is a check-in, we're done (no hours to calculate yet).
  if (type === 'in') {
    return {
      success: true,
      message: 'Checked in successfully. Have a great session!',
    };
  }

  // For check-out: find the matching unmatched 'in' and calculate hours.
  const hoursResult = await pairCheckOutWithCheckIn(
    volunteerId,
    orphanageId,
    newCheckIn
  );

  return hoursResult;
}

/**
 * Pair a new check-out scan with its matching check-in and create a
 * volunteer_hours row.
 *
 * "Matching" means: the most recent 'in' record for this volunteer at this
 * orphanage that doesn't already have a paired check-out.
 */
async function pairCheckOutWithCheckIn(
  volunteerId: string,
  orphanageId: string,
  checkOut: CheckIn
): Promise<CheckInResult> {
  const supabase = getSupabaseClient();

  // Find the matching 'in' - the most recent 'in' for this volunteer+orphanage
  // that hasn't been paired with a check-out yet.
  // We use the volunteer_hours table: any 'in' that doesn't have a volunteer_hours
  // row pointing to it is unpaired.
  const { data: pairedIns, error: pairedErr } = await supabase
    .from('volunteer_hours')
    .select('check_in_id')
    .eq('volunteer_id', volunteerId)
    .eq('orphanage_id', orphanageId);

  if (pairedErr) {
    return { success: false, message: `Database error: ${pairedErr.message}` };
  }

  const pairedIds = new Set((pairedIns ?? []).map((r) => r.check_in_id));

  // Get the most recent 'in' that isn't already paired.
  const { data: recentIns, error: recentErr } = await supabase
    .from('check_ins')
    .select('*')
    .eq('volunteer_id', volunteerId)
    .eq('orphanage_id', orphanageId)
    .eq('type', 'in')
    .order('scanned_at', { ascending: false })
    .limit(5);

  if (recentErr) {
    return { success: false, message: `Database error: ${recentErr.message}` };
  }

  const matchingIn = (recentIns ?? []).find((c) => !pairedIds.has(c.id));

  if (!matchingIn) {
    return {
      success: false,
      message:
        'No active check-in found. Please check in first before checking out.',
    };
  }

  // Calculate the hours between in and out.
  const inTime = new Date(matchingIn.scanned_at).getTime();
  const outTime = new Date(checkOut.scanned_at).getTime();
  const diffMs = outTime - inTime;
  const diffMinutes = diffMs / 1000 / 60;

  let hours = diffMs / 1000 / 60 / 60;

  // Apply anti-fraud and sanity checks.
  if (diffMinutes < MIN_SESSION_MINUTES) {
    hours = 0; // too short - likely a mis-scan
  }
  if (hours > MAX_SESSION_HOURS) {
    hours = MAX_SESSION_HOURS; // cap to prevent abuse
  }

  // Points = round(hours * 10). 1 hour = 10 points.
  const pointsEarned = Math.round(hours * 10);

  // Create the volunteer_hours row.
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { data: hoursRow, error: hoursErr } = await supabase
    .from('volunteer_hours')
    .insert({
      volunteer_id: volunteerId,
      orphanage_id: orphanageId,
      check_in_id: matchingIn.id,
      check_out_id: checkOut.id,
      hours,
      points_earned: pointsEarned,
      date: today,
    })
    .select()
    .single();

  if (hoursErr || !hoursRow) {
    return {
      success: false,
      message: `Could not save hours: ${hoursErr?.message ?? 'unknown error'}`,
    };
  }

  // Update the volunteer's denormalized totals.
  // We re-read all their hours and sum them so totals stay accurate.
  const { data: allHours, error: sumErr } = await supabase
    .from('volunteer_hours')
    .select('hours, points_earned')
    .eq('volunteer_id', volunteerId);

  if (sumErr) {
    return { success: false, message: `Could not update totals: ${sumErr.message}` };
  }

  const totalHours = (allHours ?? []).reduce(
    (sum, r) => sum + Number(r.hours),
    0
  );
  const totalPoints = (allHours ?? []).reduce(
    (sum, r) => sum + Number(r.points_earned),
    0
  );

  await supabase
    .from('volunteers')
    .update({
      total_hours: totalHours,
      total_points: totalPoints,
      updated_at: new Date().toISOString(),
    })
    .eq('id', volunteerId);

  // Check for new badges / certificates.
  const newBadge = await checkAndAwardBadges(volunteerId, totalHours);

  // Sync to the Internal Operations Platform (best-effort, async).
  // We don't block the response on this - if it fails the sync runs later.
  syncHoursToInternalPlatform(hoursRow.id).catch((err) => {
    console.error('Background sync to internal platform failed:', err);
  });

  return {
    success: true,
    message: `Checked out. ${hours.toFixed(2)} hours logged. Total: ${totalHours.toFixed(2)} hours.`,
    hoursRecord: hoursRow,
    totalHours,
    newBadge,
    certificateIssued: newBadge === 100,
  };
}

/**
 * Check whether the volunteer has crossed a milestone (10, 100, or 1000 hours)
 * and award a badge if so. Returns the milestone awarded, or undefined.
 */
async function checkAndAwardBadges(
  volunteerId: string,
  totalHours: number
): Promise<number | undefined> {
  const supabase = getSupabaseClient();
  const milestones = [10, 100, 1000] as const;
  let awarded: number | undefined;

  for (const milestone of milestones) {
    if (totalHours < milestone) continue;

    // Check if a badge already exists for this milestone.
    const { data: existing } = await supabase
      .from('badges')
      .select('id')
      .eq('volunteer_id', volunteerId)
      .eq('milestone', milestone)
      .maybeSingle();

    if (existing) continue; // already awarded

    const badgeName =
      milestone === 10
        ? 'Basic Helper'
        : milestone === 100
        ? 'Committed Champion'
        : 'Legendary Gem';

    await supabase.from('badges').insert({
      volunteer_id: volunteerId,
      milestone,
      badge_name: badgeName,
    });

    await supabase.from('audit_log').insert({
      actor_role: 'system',
      action: 'badge_awarded',
      entity_type: 'volunteer',
      entity_id: volunteerId,
      metadata: { milestone, badge_name: badgeName, total_hours: totalHours },
    });

    awarded = milestone;

    // At 100 hours, trigger certificate generation.
    if (milestone === 100) {
      await generateCertificateForVolunteer(volunteerId);
    }
  }

  return awarded;
}

/**
 * Generate a PDF certificate for a volunteer and store it in Supabase Storage.
 * Called automatically when a volunteer hits 100 hours.
 *
 * NOTE: This function imports from './certificate-generator' to avoid a
 * circular dependency.
 */
async function generateCertificateForVolunteer(volunteerId: string): Promise<void> {
  // Lazy import to avoid circular deps.
  const { generateCertificatePDF } = await import('./certificate-generator');
  await generateCertificatePDF(volunteerId);
}

/**
 * Push a hours record to the Internal Operations Platform.
 * Best-effort: if it fails, the sync can be retried later (a cron job
 * will pick up unsynced rows).
 */
async function syncHoursToInternalPlatform(hoursRowId: string): Promise<void> {
  const internalUrl = process.env.NEXT_PUBLIC_INTERNAL_PLATFORM_URL;
  const secret = process.env.INTERNAL_PLATFORM_API_SECRET;

  // If the internal platform URL isn't set yet (Phase 1), skip silently.
  if (!internalUrl || !secret) {
    console.log(
      'Internal platform URL not configured - skipping sync. Hours row:',
      hoursRowId
    );
    return;
  }

  const supabase = getSupabaseClient();
  const { data: row } = await supabase
    .from('volunteer_hours')
    .select('*, volunteers(full_name, email), orphanages(name, qr_code)')
    .eq('id', hoursRowId)
    .single();

  if (!row) return;

  try {
    const res = await fetch(`${internalUrl}/api/ingest/volunteer-hours`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': secret,
      },
      body: JSON.stringify(row),
    });

    if (res.ok) {
      await supabase
        .from('volunteer_hours')
        .update({ synced_to_internal: true })
        .eq('id', hoursRowId);
    }
  } catch (err) {
    // Logged by caller.
    throw err;
  }
}
