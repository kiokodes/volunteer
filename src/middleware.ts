/**
 * middleware.ts
 *
 * Next.js middleware runs on every request before the page renders.
 * Here we use it to:
 *  1. Refresh the Supabase session cookie (keeps users logged in)
 *  2. Protect routes that require authentication
 *
 * Public routes (no login needed): /, /auth/*, /leaderboard
 * Protected routes: /volunteer, /scan, /orphanage/*
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that anyone can access without being logged in
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register", "/leaderboard"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Create a Supabase client using the request/response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is important for long-lived sessions
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // If the user is not logged in and trying to access a protected route, redirect to login
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith("/auth/")
  );

  if (!user && !isPublic) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

// Run middleware on all routes except static files and API routes that don't need auth
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
