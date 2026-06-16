/**
 * Supabase clients for the NextGem Volunteer Platform.
 *
 * Two clients are exported:
 *   - `getSupabaseClient()`  - browser-safe client using the anon key.
 *                              Used in client components and pages.
 *   - `getSupabaseAdmin()`   - server-only client using the service role key.
 *                              Has full access. NEVER expose to the browser.
 *                              Used for: webhooks, cron, syncing to internal platform.
 *
 * Why two clients?
 *   Supabase enforces Row Level Security based on the JWT of the requesting client.
 *   The anon client respects RLS (good for users). The service role client
 *   bypasses RLS (needed for admin operations like pushing hours to the
 *   Internal Operations Platform).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache the clients so we don't create a new one on every request.
let _anonClient: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

/**
 * Browser-safe Supabase client.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * which are safe to expose (they're meant to be public).
 */
export function getSupabaseClient(): SupabaseClient {
  if (_anonClient) return _anonClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See README.md for setup.'
    );
  }

  _anonClient = createClient(url, anonKey, {
    auth: {
      // Persist session in localStorage so volunteers stay logged in across refreshes.
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _anonClient;
}

/**
 * Server-only admin Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY which must NEVER be exposed to the browser.
 * Bypasses Row Level Security - use with care.
 *
 * Only call this from API routes (server-side code). Never import it in a
 * 'use client' component.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    );
  }

  _adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _adminClient;
}
