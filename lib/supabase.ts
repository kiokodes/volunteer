/**
 * Supabase clients for the NextGem Volunteer Platform.
 *
 * Two clients:
 *   - getSupabaseClient() - browser-safe (uses anon key). Used by the
 *     volunteer UI for scanning QR codes, viewing the public leaderboard,
 *     and signing in (with NextGem code).
 *   - getSupabaseAdmin()  - server-only (uses service role). Used by API
 *     routes that need to bypass RLS (QR rotation, awarding badges, etc).
 *
 * The auth flow:
 *   Volunteers sign in with their NextGem code (e.g. NG-2026-V-0042) +
 *   password. We convert the code to a synthetic email
 *   (ng-2026-v-0042@nextgem.volunteers) and call Supabase Auth with that.
 *   This lets us keep using Supabase's built-in auth + RLS without
 *   building a separate auth system.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _anonClient: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

/**
 * Convert a NextGem code to the synthetic auth email.
 * Example: NG-2026-V-0042 -> ng-2026-v-0042@nextgem.volunteers
 */
export function codeToEmail(code: string): string {
  return `${code.toLowerCase().replace(/[^a-z0-9]/g, '')}@nextgem.volunteers`;
}

/**
 * Browser-safe Supabase client.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_anonClient) return _anonClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
  }

  _anonClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _anonClient;
}

/**
 * Server-only admin Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY - never expose to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase admin env vars. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    );
  }

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _adminClient;
}
