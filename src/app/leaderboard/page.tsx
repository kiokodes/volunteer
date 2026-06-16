/**
 * app/leaderboard/page.tsx
 *
 * Public leaderboard showing the top volunteers by total hours.
 * This page is publicly accessible (no login required) to motivate volunteers.
 *
 * Shows:
 * - All-time top 20 volunteers
 * - Monthly top 10 volunteers
 */

import { createClient } from "@/lib/supabase/server";
import { badgeColor, badgeLabel } from "@/lib/gamification";
import { BadgeTier } from "@/types";
import { Trophy, Medal, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Helper: return the start of the current calendar month as ISO string
function startOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function LeaderboardPage() {
  const supabase = createClient();

  // ── All-time leaderboard: top 20 by total hours ──────────────────────────────
  const { data: allTime } = await supabase
    .from("volunteer_stats")
    .select("volunteer_id, total_hours, total_points, badge_tier, profiles(full_name)")
    .order("total_hours", { ascending: false })
    .limit(20);

  // ── Monthly leaderboard: sum hours from check_records this month ─────────────
  // We group by volunteer and sum hours_worked for records in the current month
  const { data: monthlyRaw } = await supabase
    .from("check_records")
    .select("volunteer_id, hours_worked, profiles(full_name)")
    .gte("check_in_time", startOfMonth())
    .not("hours_worked", "is", null);

  // Aggregate monthly hours per volunteer in JS (Supabase free tier doesn't support GROUP BY via PostgREST easily)
  const monthlyMap = new Map<string, { name: string; hours: number }>();
  for (const row of monthlyRaw ?? []) {
    if (!row.volunteer_id) continue;
    const existing = monthlyMap.get(row.volunteer_id);
    // @ts-ignore — Supabase join
    const name = row.profiles?.full_name ?? "Unknown";
    monthlyMap.set(row.volunteer_id, {
      name,
      hours: (existing?.hours ?? 0) + (row.hours_worked ?? 0),
    });
  }

  const monthly = Array.from(monthlyMap.entries())
    .map(([id, { name, hours }]) => ({ volunteer_id: id, name, hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // ── Medal colours for top 3 ───────────────────────────────────────────────────
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/volunteer" className="text-ink-muted hover:text-ink">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-semibold text-ink flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Leaderboard
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Monthly Leaderboard ── */}
        <section>
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
            This Month
          </h2>
          <div className="card p-0 overflow-hidden">
            {monthly.length === 0 ? (
              <p className="text-sm text-ink-faint text-center py-6">
                No activity logged this month yet.
              </p>
            ) : (
              <ol>
                {monthly.map((entry, i) => (
                  <li
                    key={entry.volunteer_id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < monthly.length - 1 ? "border-b border-slate-100" : ""}`}
                  >
                    {/* Rank */}
                    <span className="text-lg w-6 text-center flex-shrink-0">
                      {medals[i] ?? <span className="text-sm text-ink-faint font-medium">{i + 1}</span>}
                    </span>

                    {/* Avatar initial */}
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-700 text-sm font-bold">
                        {entry.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{entry.name}</p>
                    </div>

                    {/* Hours */}
                    <span className="text-sm font-semibold text-brand-600 flex-shrink-0">
                      {entry.hours.toFixed(1)} hrs
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* ── All-Time Leaderboard ── */}
        <section>
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
            All Time
          </h2>
          <div className="card p-0 overflow-hidden">
            {!allTime || allTime.length === 0 ? (
              <p className="text-sm text-ink-faint text-center py-6">
                No volunteer hours recorded yet.
              </p>
            ) : (
              <ol>
                {allTime.map((entry, i) => {
                  // @ts-ignore — Supabase join
                  const name: string = entry.profiles?.full_name ?? "Unknown Volunteer";
                  const tier = (entry.badge_tier ?? "none") as BadgeTier;

                  return (
                    <li
                      key={entry.volunteer_id}
                      className={`flex items-center gap-3 px-4 py-3 ${i < allTime.length - 1 ? "border-b border-slate-100" : ""}`}
                    >
                      {/* Rank */}
                      <span className="text-lg w-6 text-center flex-shrink-0">
                        {medals[i] ?? <span className="text-sm text-ink-faint font-medium">{i + 1}</span>}
                      </span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-700 text-sm font-bold">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Name + badge */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{name}</p>
                        {tier !== "none" && (
                          <span className={`badge mt-0.5 ${badgeColor(tier)}`}>
                            {badgeLabel(tier)}
                          </span>
                        )}
                      </div>

                      {/* Hours + points */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-brand-600">
                          {entry.total_hours.toFixed(1)} hrs
                        </p>
                        <p className="text-xs text-ink-faint">
                          {entry.total_points.toLocaleString()} pts
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* Bottom padding for mobile nav */}
        <div className="pb-6" />
      </main>
    </div>
  );
}
