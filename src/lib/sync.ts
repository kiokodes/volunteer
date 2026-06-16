/**
 * lib/sync.ts
 *
 * Handles syncing volunteer check-in/out data to the Internal Operations Platform.
 *
 * Design:
 * - All sync calls are fire-and-forget from the volunteer's perspective.
 * - If the sync fails (network issue), we mark synced_to_internal = false in Supabase.
 * - A background retry job (or the next successful action) can pick up unsynced records.
 * - This approach means the Volunteer Platform always works, even offline.
 */

import { CheckRecord } from "@/types";

const INTERNAL_API_URL  = process.env.INTERNAL_PLATFORM_API_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_PLATFORM_API_SECRET;

/**
 * syncCheckRecord
 * POST a single completed check-in/out record to the Internal Operations Platform.
 * Returns true if the sync succeeded, false if it failed.
 *
 * The Internal Platform must expose:
 *   POST /api/volunteer-hours
 *   Headers: x-api-secret: <INTERNAL_PLATFORM_API_SECRET>
 *   Body: CheckRecord JSON
 */
export async function syncCheckRecord(record: CheckRecord): Promise<boolean> {
  // If the internal platform URL isn't configured, skip silently
  // (useful during development before the Internal Platform is built)
  if (!INTERNAL_API_URL || !INTERNAL_API_SECRET) {
    console.warn("[sync] INTERNAL_PLATFORM_API_URL or SECRET not set — skipping sync.");
    return false;
  }

  try {
    const response = await fetch(`${INTERNAL_API_URL}/volunteer-hours`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Shared secret so the Internal Platform can verify the request is from us
        "x-api-secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify(record),
      // 10-second timeout so we don't hang if the Internal Platform is down
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[sync] Internal Platform returned ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    // Network failure, timeout, etc. — log and return false so caller can mark as unsynced
    console.error("[sync] Failed to sync record:", error);
    return false;
  }
}

/**
 * syncFlag
 * POST a volunteer flag (raised by a matron) to the Internal Operations Platform.
 */
export async function syncFlag(flag: {
  volunteer_id: string;
  orphanage_id: string;
  matron_id: string;
  reason: string;
}): Promise<boolean> {
  if (!INTERNAL_API_URL || !INTERNAL_API_SECRET) return false;

  try {
    const response = await fetch(`${INTERNAL_API_URL}/volunteer-flags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify(flag),
      signal: AbortSignal.timeout(10_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * syncCertificate
 * Notify the Internal Operations Platform that a certificate was issued.
 */
export async function syncCertificate(volunteerId: string, issuedAt: string): Promise<boolean> {
  if (!INTERNAL_API_URL || !INTERNAL_API_SECRET) return false;

  try {
    const response = await fetch(`${INTERNAL_API_URL}/volunteer-certificates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ volunteer_id: volunteerId, issued_at: issuedAt }),
      signal: AbortSignal.timeout(10_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}
