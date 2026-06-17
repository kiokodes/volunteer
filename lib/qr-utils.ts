/**
 * QR code generation + rotation utilities.
 *
 * QRs are formatted like: NG-YYYY-O-NNNN-XX
 *   - NG = NextGem
 *   - YYYY = year issued
 *   - O = orphanage
 *   - NNNN = orphanage sequence number
 *   - XX = random suffix
 *
 * The "year issued" prefix means we can identify QRs from a glance and
 * the random suffix means each rotation produces a unique value.
 *
 * Why rotate? Matrons and volunteers can save/print the QR. If we never
 * rotated it, someone could collect 12 months of points using the same
 * QR. Rotating monthly means each QR is only valid for ~30 days.
 */

import QRCode from 'qrcode';
import { getSupabaseAdmin } from './supabase';

/**
 * Generate a new QR code token for an orphanage.
 * Format: NG-{year}-O-{seq}-{4char-random}
 * Example: NG-2026-O-0001-K7M2
 */
export function generateOrphanageQRToken(orphanageIdOrState: string): string {
  const year = new Date().getFullYear();
  // Take first 3 chars of state-like input (uppercased).
  const prefix = orphanageIdOrState.substring(0, 3).toUpperCase();
  // 4-char alphanumeric random suffix.
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  // 4-digit sequence - in production this would be the orphanage's
  // index. For now we just generate a pseudo-random 4-digit number.
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `NG-${year}-O-${seq}-${random}`;
}

/**
 * Generate a NextGem volunteer code.
 *
 * Format: ST/0129 (e.g. "BY/0129", "LA/0042", "FC/0001")
 *   - ST  = 2-letter Nigerian state code (NYSC convention - familiar)
 *   - 0129 = 4-digit serial number
 *
 * Why this format?
 *   - Easy to remember (2 letters + 4 digits = 7 characters)
 *   - Familiar to Nigerians (similar to NYSC state codes)
 *   - Simple to type on a phone keypad
 *   - Up to 10,000 volunteers per state (36 states × 10k = 360k total)
 *
 * Optionally accepts a state code to make the prefix match the volunteer's
 * primary state of operation. If omitted, a random state code is picked.
 */
export function generateNextGemVolunteerCode(stateCode?: string): string {
  const code = (stateCode || pickRandomStateCode()).toUpperCase();
  // 4-digit serial - padded with zeros for sortability
  const serial = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${code}/${serial}`;
}

/**
 * Nigerian state codes (NYSC convention).
 * Two letters each. Includes FCT for Abuja.
 */
export const NIGERIAN_STATE_CODES: Record<string, string> = {
  'Abia': 'AB',
  'Adamawa': 'AD',
  'Akwa Ibom': 'AK',
  'Anambra': 'AN',
  'Bauchi': 'BA',
  'Bayelsa': 'BY',
  'Benue': 'BE',
  'Borno': 'BO',
  'Cross River': 'CR',
  'Delta': 'DE',
  'Ebonyi': 'EB',
  'Edo': 'ED',
  'Ekiti': 'EK',
  'Enugu': 'EN',
  'FCT (Abuja)': 'FC',
  'Gombe': 'GO',
  'Imo': 'IM',
  'Jigawa': 'JI',
  'Kaduna': 'KD',
  'Kano': 'KN',
  'Katsina': 'KT',
  'Kebbi': 'KE',
  'Kogi': 'KO',
  'Kwara': 'KW',
  'Lagos': 'LA',
  'Nasarawa': 'NA',
  'Niger': 'NI',
  'Ogun': 'OG',
  'Ondo': 'ON',
  'Osun': 'OS',
  'Oyo': 'OY',
  'Plateau': 'PL',
  'Rivers': 'RI',
  'Sokoto': 'SO',
  'Taraba': 'TA',
  'Yobe': 'YO',
  'Zamfara': 'ZA',
};

function pickRandomStateCode(): string {
  const codes = Object.values(NIGERIAN_STATE_CODES);
  return codes[Math.floor(Math.random() * codes.length)];
}

/**
 * Generate a QR code as a Data URL (PNG) for the given payload.
 * Uses brand colors (NextGem blue).
 */
export async function generateQRDataURL(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 512,
    color: {
      dark: '#004485', // brand-900 - NextGem blue for high contrast
      light: '#FFFFFF',
    },
  });
}

/**
 * Check if a QR token is currently valid for a given orphanage.
 * Returns { valid, reason } where reason explains why invalid (if so).
 */
export function checkQRValidity(
  orphanage: { current_qr_code?: string | null; qr_expires_at?: string | null },
  scannedToken: string
): { valid: boolean; reason?: string } {
  // Token must match the current QR.
  if (orphanage.current_qr_code !== scannedToken) {
    return { valid: false, reason: 'This QR code has been replaced. Ask the matron for the new one.' };
  }
  // Check expiry.
  if (orphanage.qr_expires_at) {
    const expiry = new Date(orphanage.qr_expires_at);
    if (expiry < new Date()) {
      return { valid: false, reason: 'This QR code has expired. Ask the matron for the new one.' };
    }
  }
  return { valid: true };
}

/**
 * Rotate the QR code for an orphanage.
 *
 * Side effects:
 *   1. Closes out the current rotation in qr_rotation_history
 *      (sets effective_to = now).
 *   2. Generates a new QR token.
 *   3. Sets the orphanage.current_qr_code to the new token.
 *   4. Sets qr_expires_at to (now + daysValid).
 *   5. Logs the new rotation in qr_rotation_history.
 *
 * @param adminUserId  - the auth.users.id of the admin performing the rotation
 * @param expiresInDays - how long until the new QR expires (default: 30)
 * @param reason - optional human note (e.g. "monthly rotation")
 *
 * Returns: { new_qr_code, expires_at }
 */
export async function rotateOrphanageQR(
  orphanageId: string,
  adminUserId: string,
  expiresInDays = 30,
  reason: string | null = 'Monthly rotation'
): Promise<{ new_qr_code: string; expires_at: string }> {
  const admin = getSupabaseAdmin();

  // Fetch the orphanage.
  const { data: orph, error: orphErr } = await admin
    .from('orphanages').select('*').eq('id', orphanageId).single();
  if (orphErr || !orph) throw new Error('Orphanage not found');

  const now = new Date();
  const newExpiry = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  // 1. Close out the current rotation.
  if (orph.current_qr_code) {
    await admin.from('qr_rotation_history').insert({
      orphanage_id: orphanageId,
      qr_code: orph.current_qr_code,
      effective_from: orph.qr_rotated_at ?? orph.created_at,
      effective_to: now.toISOString(),
      rotated_by: adminUserId,
      reason: 'Replaced by newer QR',
    });
  }

  // 2. Generate the new QR token.
  const newToken = generateOrphanageQRToken(orph.state);

  // 3. Insert the new rotation row.
  await admin.from('qr_rotation_history').insert({
    orphanage_id: orphanageId,
    qr_code: newToken,
    effective_from: now.toISOString(),
    effective_to: null, // still active
    rotated_by: adminUserId,
    reason,
  });

  // 4. Update the orphanage.
  await admin.from('orphanages').update({
    current_qr_code: newToken,
    qr_expires_at: newExpiry.toISOString(),
    qr_rotated_at: now.toISOString(),
    qr_rotated_by: adminUserId,
    updated_at: now.toISOString(),
  }).eq('id', orphanageId);

  return {
    new_qr_code: newToken,
    expires_at: newExpiry.toISOString(),
  };
}
