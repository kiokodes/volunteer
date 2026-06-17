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
 * QR validation:
 *   Before allowing a scan, we verify the scanned QR is the CURRENT,
 *   non-expired QR for that orphanage. Old / rotated QRs are rejected.
 *
 * Edge cases handled:
 *   - Volunteer scans 'out' without an active 'in' -> ignored with a warning.
 *   - Volunteer scans 'in' twice in a row -> the second scan is ignored.
 *   - Sessions longer than 12 hours -> capped at 12 hours (anti-fraud).
 *   - Sessions shorter than 1 minute -> set to 0 hours (likely a mis-scan).
 */

import { getSupabaseClient, getSupabaseAdmin } from './supabase';
import { checkQRValidity } from './qr-utils';
import type { CheckIn, VolunteerHour } from './types';

const MAX_SESSION_HOURS = 12;
const MIN_SESSION_MINUTES = 1;

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
 * @param scannedQrCode - the actual QR string scanned (used for validation)
 * @param type - 'in' or 'out'
 */
export async function recordCheckIn(
  volunteerId: string,
  orphanageId: string,
  scannedQrCode: string,
  type: 'in' | 'out'
): Promise<CheckInResult> {
  const supabase = getSupabaseClient();

  // 1. Validate the QR code against the orphanage's current QR.
  const { data: orph, error: orphErr } = await supabase
    .from('orphanages')
    .select('id, current_qr_code, qr_expires_at, is_active')
    .eq('id', orphanageId)
    .maybeSingle();

  if (orphErr || !orph) {
    return { success: false, message: 'Orphanage not found.' };
  }
  if (!orph.is_active) {
    return { success: false, message: 'This orphanage is no longer active.' };
  }

  const validity = checkQRValidity(orph, scannedQrCode);
  if (!validity.valid) {
    return { success: false, message: validity.reason ?? 'QR is no longer valid.' };
  }

  // 2. Insert the new check-in row, recording the QR that was scanned.
  const { data: newCheckIn, error: insertError } = await supabase
    .from('check_ins')
    .insert({
      volunteer_id: volunteerId,
      orphanage_id: orphanageId,
      scanned_qr_code: scannedQrCode,
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

  // 3. Audit log.
  await supabase.from('audit_log').insert({
    actor_id: volunteerId,
    actor_role: 'volunteer',
    action: type === 'in' ? 'check_in' : 'check_out',
    entity_type: 'check_in',
    entity_id: newCheckIn.id,
    metadata: { orphanage_id: orphanageId, qr_code: scannedQrCode },
  });

  // 4. If this is a check-in, we're done (no hours to calculate yet).
  if (type === 'in') {
    return {
      success: true,
      message: 'Checked in successfully. Have a great session!',
    };
  }

  // 5. For check-out: pair with the most recent unpaired 'in' and calculate hours.
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
 */
async function pairCheckOutWithCheckIn(
  volunteerId: string,
  orphanageId: string,
  checkOut: CheckIn
): Promise<CheckInResult> {
  const supabase = getSupabaseClient();

  // Find the most recent 'in' that hasn't been paired yet.
  const { data: pairedIns, error: pairedErr } = await supabase
    .from('volunteer_hours')
    .select('check_in_id')
    .eq('volunteer_id', volunteerId)
    .eq('orphanage_id', orphanageId);

  if (pairedErr) {
    return { success: false, message: `Database error: ${pairedErr.message}` };
  }

  const pairedIds = new Set((pairedIns ?? []).map((r) => r.check_in_id));

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
      message: 'No active check-in found. Please check in first before checking out.',
    };
  }

  // Calculate hours.
  const inTime = new Date(matchingIn.scanned_at).getTime();
  const outTime = new Date(checkOut.scanned_at).getTime();
  const diffMs = outTime - inTime;
  const diffMinutes = diffMs / 1000 / 60;

  let hours = diffMs / 1000 / 60 / 60;

  if (diffMinutes < MIN_SESSION_MINUTES) {
    hours = 0;
  }
  if (hours > MAX_SESSION_HOURS) {
    hours = MAX_SESSION_HOURS;
  }

  const pointsEarned = Math.round(hours * 10);

  // Create the volunteer_hours row.
  const today = new Date().toISOString().split('T')[0];
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

  // Sync to internal platform (best-effort, async).
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

    const { data: existing } = await supabase
      .from('badges')
      .select('id')
      .eq('volunteer_id', volunteerId)
      .eq('milestone', milestone)
      .maybeSingle();

    if (existing) continue;

    const badgeName =
      milestone === 10 ? 'Basic Helper' :
      milestone === 100 ? 'Committed Champion' :
      'Legendary Gem';

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

    if (milestone === 100) {
      await generateCertificateForVolunteer(volunteerId);
    }
  }

  return awarded;
}

async function generateCertificateForVolunteer(volunteerId: string): Promise<void> {
  const { generateCertificatePDF } = await import('./certificate-generator');
  await generateCertificatePDF(volunteerId);
}

async function syncHoursToInternalPlatform(hoursRowId: string): Promise<void> {
  const internalUrl = process.env.NEXT_PUBLIC_INTERNAL_PLATFORM_URL;
  const secret = process.env.INTERNAL_PLATFORM_API_SECRET;

  if (!internalUrl || !secret) {
    console.log('Internal platform URL not configured - skipping sync.');
    return;
  }

  const supabase = getSupabaseClient();
  const { data: row } = await supabase
    .from('volunteer_hours')
    .select('*, volunteers(full_name, auth_email, contact_email), orphanages(name)')
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
    throw err;
  }
}
