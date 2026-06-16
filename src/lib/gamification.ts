/**
 * lib/gamification.ts
 *
 * All gamification logic lives here so it is easy to find and modify.
 * Import these functions wherever you need badge/points calculations.
 */

import { BadgeTier, MILESTONES, POINTS_PER_HOUR } from "@/types";

/**
 * calculatePoints
 * Convert total volunteer hours into total points.
 * Simple linear formula: 10 points per hour.
 */
export function calculatePoints(totalHours: number): number {
  return Math.floor(totalHours * POINTS_PER_HOUR);
}

/**
 * getBadgeTier
 * Return the highest badge tier a volunteer has earned based on their total hours.
 * Milestones are checked from highest to lowest so we return the best earned tier.
 */
export function getBadgeTier(totalHours: number): BadgeTier {
  // Check milestones from highest to lowest
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (totalHours >= MILESTONES[i].hours) {
      return MILESTONES[i].tier;
    }
  }
  return "none";
}

/**
 * getNextMilestone
 * Return the next milestone the volunteer is working toward.
 * Returns null if the volunteer has reached the highest milestone.
 */
export function getNextMilestone(totalHours: number) {
  return MILESTONES.find((m) => totalHours < m.hours) ?? null;
}

/**
 * getMilestoneProgress
 * Return a 0–100 percentage showing progress toward the next milestone.
 * Used to render the progress bar on the volunteer dashboard.
 */
export function getMilestoneProgress(totalHours: number): number {
  const next = getNextMilestone(totalHours);
  if (!next) return 100; // All milestones complete

  // Find the previous milestone threshold (or 0 if this is the first)
  const milestoneIndex = MILESTONES.indexOf(next);
  const prevThreshold = milestoneIndex > 0 ? MILESTONES[milestoneIndex - 1].hours : 0;

  // Progress is how far through the current band we are
  const progress =
    ((totalHours - prevThreshold) / (next.hours - prevThreshold)) * 100;

  return Math.min(Math.max(Math.round(progress), 0), 100);
}

/**
 * shouldIssueCertificate
 * Returns true if the volunteer has reached 100 hours and hasn't received a certificate yet.
 * The certificate is only issued once.
 */
export function shouldIssueCertificate(
  totalHours: number,
  alreadyIssued: boolean
): boolean {
  return totalHours >= 100 && !alreadyIssued;
}

/**
 * badgeLabel
 * Human-readable label for each badge tier.
 */
export function badgeLabel(tier: BadgeTier): string {
  const labels: Record<BadgeTier, string> = {
    none:         "No badge yet",
    basic:        "First Steps",
    intermediate: "Dedicated Volunteer",
    advanced:     "Champion",
  };
  return labels[tier];
}

/**
 * badgeColor
 * Tailwind colour classes for each badge tier (used in the UI).
 */
export function badgeColor(tier: BadgeTier): string {
  const colors: Record<BadgeTier, string> = {
    none:         "bg-slate-100 text-slate-500",
    basic:        "bg-green-100 text-green-700",
    intermediate: "bg-blue-100 text-blue-700",
    advanced:     "bg-amber-100 text-amber-700",
  };
  return colors[tier];
}
