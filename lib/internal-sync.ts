/**
 * Helper for syncing data to the Internal Operations Platform.
 *
 * The Internal Operations Platform will expose an `/api/ingest/...` endpoint
 * for the Volunteer Platform to push:
 *   - volunteer hours
 *   - check-in/out records
 *   - flags raised by matrons
 *   - certificates issued
 *
 * Until that platform is built, the sync attempts are no-ops (logged but
 * not fatal). When the founder provides the URL, just set
 * NEXT_PUBLIC_INTERNAL_PLATFORM_URL and INTERNAL_PLATFORM_API_SECRET and
 * the sync will start working automatically.
 */

const SYNC_TIMEOUT_MS = 5000;

export interface SyncPayload {
  type: 'volunteer_hours' | 'check_in' | 'flag' | 'certificate';
  data: unknown;
}

/**
 * Send a payload to the Internal Operations Platform.
 * Returns true if synced successfully, false otherwise.
 */
export async function syncToInternalPlatform(payload: SyncPayload): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_INTERNAL_PLATFORM_URL;
  const secret = process.env.INTERNAL_PLATFORM_API_SECRET;

  // If internal platform URL isn't set (Phase 1), skip silently.
  if (!url || !secret) {
    console.log(
      `[sync] Skipping ${payload.type} sync - internal platform URL not configured.`
    );
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

    const res = await fetch(`${url}/api/ingest/${payload.type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': secret,
      },
      body: JSON.stringify(payload.data),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(
        `[sync] Internal platform returned ${res.status} for ${payload.type}`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[sync] Failed to sync ${payload.type} to internal platform:`, err);
    return false;
  }
}
