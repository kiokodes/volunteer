/**
 * app/volunteer/page.tsx
 *
 * Volunteer Dashboard — the main screen a volunteer sees after logging in.
 *
 * Shows:
 * - Total hours and points
 * - Current badge
 * - Progress bar toward next milestone
 * - Recent check-in history
 * - Certificate download button (if earned)
 * - Quick link to scan QR code
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  getBadgeTier,
  getNextMilestone,
  getMilestoneProgress,
  calculatePoints,
  badgeLabel,
  badgeColor,
} from "@/lib/gamification";
import { CheckRecord, MILESTONES } from "@/types";
import { QrCode, Award, Clock, TrendingUp, Download } from "lucide-react";
import CertificateButton from "@/components/CertificateButton";

export default async function VolunteerDashboard() {
  const supabase = createClient();

  // Guard: only logged-in volunteers can see this page
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch the volunteer's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  // Fetch volunteer stats (total hours, points, badge, certificate)
  const { data: stats } = await supabase
    .from("volunteer_stats")
    .select("*")
    .eq("volunteer_id", user.id)
    .single();

  const totalHours   = stats?.total_hours        ?? 0;
  const totalPoints  = stats?.total_points       ?? calculatePoints(totalHours);
  const badgeTier    = getBadgeTier(totalHours);
  const nextMile     = getNextMilestone(totalHours);
  const progress     = getMilestoneProgress(totalHours);
  const certIssued   = stats?.certificate_issued ?? false;

  // Fetch the 5 most recent check-in/out records for the activity feed
  const { data: recentChecks } = await supabase
    .from("check_records")
    .select("*, orphanages(name)")
    .eq("volunteer_id", user.id)
    .order("check_in_time", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* ── Top nav ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="font-semibold text-ink text-sm">NextGem</span>
          </div>
          <span className="text-sm text-ink-muted">
            {profile.full_name}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

        {/* ── Greeting ── */}
        <div>
          <h1 className="text-xl font-bold text-ink">
            Welcome back, {profile.full_name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Here&apos;s your volunteer summary.
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-ink-muted text-xs font-medium uppercase tracking-wide">
              <Clock size={13} /> Hours
            </div>
            <p className="text-3xl font-bold text-ink">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-ink-faint">total volunteered</p>
          </div>

          <div className="card flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-ink-muted text-xs font-medium uppercase tracking-wide">
              <TrendingUp size={13} /> Points
            </div>
            <p className="text-3xl font-bold text-brand-600">{totalPoints.toLocaleString()}</p>
            <p className="text-xs text-ink-faint">earned so far</p>
          </div>
        </div>

        {/* ── Badge ── */}
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Award size={24} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-muted font-medium uppercase tracking-wide mb-0.5">
              Current badge
            </p>
            <span className={`badge text-sm ${badgeColor(badgeTier)}`}>
              {badgeLabel(badgeTier)}
            </span>
          </div>
          {certIssued && (
            <CertificateButton
              volunteerName={profile.full_name}
              totalHours={totalHours}
            />
          )}
        </div>

        {/* ── Progress toward next milestone ── */}
        {nextMile ? (
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-ink">
                Next milestone: {nextMile.hours} hrs
              </p>
              <p className="text-sm text-ink-muted">
                {(nextMile.hours - totalHours).toFixed(1)} hrs to go
              </p>
            </div>
            {/* Progress bar */}
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-ink-faint">{progress}% complete</span>
              <span className="text-xs text-ink-faint">
                🏅 {nextMile.label} badge
              </span>
            </div>
          </div>
        ) : (
          <div className="card bg-amber-50 border-amber-200 text-center">
            <p className="text-amber-800 font-semibold">🏆 All milestones complete!</p>
            <p className="text-amber-700 text-sm mt-1">You are a NextGem Champion.</p>
          </div>
        )}

        {/* ── Milestone overview ── */}
        <div className="card">
          <h2 className="text-sm font-semibold text-ink mb-3">Milestones</h2>
          <div className="flex flex-col gap-2">
            {MILESTONES.map((m) => {
              const earned = totalHours >= m.hours;
              return (
                <div key={m.hours} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0
                    ${earned ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-faint"}`}>
                    {earned ? "✓" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${earned ? "text-ink" : "text-ink-muted"}`}>
                      {m.hours} hours — {m.label}
                    </p>
                  </div>
                  <span className={`text-xs ${earned ? "text-success" : "text-ink-faint"}`}>
                    {earned ? "Earned" : `+${m.points.toLocaleString()} pts`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Recent activity ── */}
        <div className="card">
          <h2 className="text-sm font-semibold text-ink mb-3">Recent activity</h2>
          {recentChecks && recentChecks.length > 0 ? (
            <div className="flex flex-col divide-y divide-slate-100">
              {recentChecks.map((c: CheckRecord & { orphanages: { name: string } }) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {/* @ts-ignore — Supabase join */}
                      {c.orphanages?.name ?? "Unknown orphanage"}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {new Date(c.check_in_time).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-600">
                    {c.hours_worked != null
                      ? `${c.hours_worked.toFixed(1)} hrs`
                      : <span className="text-warning text-xs">In progress</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint text-center py-4">
              No check-ins yet. Scan a QR code to get started!
            </p>
          )}
        </div>

        {/* ── Navigation buttons ── */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <Link href="/scan" className="btn-primary justify-center py-3.5 flex flex-col items-center gap-1 h-auto rounded-lg">
            <QrCode size={22} />
            <span className="text-xs">Scan QR Code</span>
          </Link>
          <Link href="/leaderboard" className="btn-secondary justify-center py-3.5 flex flex-col items-center gap-1 h-auto rounded-lg">
            <TrendingUp size={22} />
            <span className="text-xs">Leaderboard</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
