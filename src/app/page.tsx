/**
 * app/page.tsx
 *
 * Root landing page.
 * If the user is logged in → redirect to their dashboard based on role.
 * If not logged in → show a simple welcome / sign-in prompt.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to the right dashboard
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "matron") redirect("/orphanage/qr");
    redirect("/volunteer");
  }

  // Not logged in — show landing page
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-xl mb-4">
          <span className="text-white text-2xl font-bold">N</span>
        </div>
        <h1 className="text-2xl font-bold text-ink">NextGem Volunteer Platform</h1>
        <p className="text-ink-muted mt-2 max-w-sm">
          Track your hours, earn badges, and make a real difference for children across Nigeria.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/auth/login" className="btn-primary justify-center py-3 text-base">
          Sign in
        </Link>
        <Link href="/auth/register" className="btn-secondary justify-center py-3 text-base">
          Create account
        </Link>
      </div>

      {/* Leaderboard link — public */}
      <p className="mt-8 text-sm text-ink-faint">
        View the{" "}
        <Link href="/leaderboard" className="text-brand-600 hover:underline">
          volunteer leaderboard
        </Link>
      </p>
    </main>
  );
}
