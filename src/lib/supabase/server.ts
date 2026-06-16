/**
 * lib/supabase/server.ts
 *
 * Server-side Supabase client.
 * Use this in Server Components and API Route Handlers.
 * It reads the session from cookies, so the user stays authenticated across requests.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies are read-only.
            // This is safe to ignore — middleware handles session refresh.
          }
        },
      },
    }
  );
}
