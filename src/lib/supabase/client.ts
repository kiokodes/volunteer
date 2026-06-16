/**
 * lib/supabase/client.ts
 *
 * Browser-side Supabase client.
 * Use this in any Client Component ("use client") that needs to talk to Supabase.
 * It is safe to call createBrowserClient multiple times — it returns a singleton.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
