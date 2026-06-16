/**
 * Gamification rules and helpers.
 *
 * The gamification system is intentionally simple:
 *   - 10 hours   -> "Basic Helper" badge
 *   - 100 hours  -> "Committed Champion" badge + auto certificate
 *   - 1000 hours -> "Legendary Gem" badge + special recognition
 *
 * Points: 10 points per hour worked.
 *
 * Why so simple? Because the PRD explicitly says: prioritize simplicity
 * and maintainability over complex features.
 */

export const MILESTONES = [10, 100, 1000] as const;
export type Milestone = (typeof MILESTONES)[number];

export const POINTS_PER_HOUR = 10;

/**
 * Map a milestone to its badge name.
 */
export function getBadgeName(milestone: Milestone): string {
  switch (milestone) {
    case 10:
      return 'Basic Helper';
    case 100:
      return 'Committed Champion';
    case 1000:
      return 'Legendary Gem';
  }
}

/**
 * Map a milestone to a short emoji-free label.
 */
export function getMilestoneLabel(milestone: Milestone): string {
  switch (milestone) {
    case 10:
      return '10 hrs - Basic Helper';
    case 100:
      return '100 hrs - Committed Champion';
    case 1000:
      return '1000 hrs - Legendary Gem';
  }
}

/**
 * Find the next milestone a volunteer is working toward.
 * Returns the next milestone and hours needed to reach it.
 */
export function getNextMilestone(totalHours: number): {
  milestone: Milestone;
  hoursToGo: number;
  progress: number; // 0 to 1
} | null {
  for (const milestone of MILESTONES) {
    if (totalHours < milestone) {
      return {
        milestone,
        hoursToGo: milestone - totalHours,
        // Progress = (current - previous milestone) / (this milestone - previous milestone)
        progress: getProgressTowards(totalHours, milestone),
      };
    }
  }
  // Already past the last milestone.
  return null;
}

/**
 * Calculate progress (0 to 1) towards a specific milestone, starting
 * from the previous one.
 *
 * Examples:
 *   getProgressTowards(0, 10) -> 0
 *   getProgressTowards(5, 10) -> 0.5
 *   getProgressTowards(9.99, 10) -> 0.999
 *   getProgressTowards(95, 100) -> 0.5 (came from 10hr badge at 10, so 85/90)
 */
export function getProgressTowards(currentHours: number, target: Milestone): number {
  const previous = getPreviousMilestone(target);
  if (previous === null) {
    // First milestone - progress is just current / target.
    return Math.min(1, currentHours / target);
  }
  const span = target - previous;
  const achieved = currentHours - previous;
  return Math.min(1, Math.max(0, achieved / span));
}

/**
 * Returns the milestone just below the given one, or null if it's the first.
 */
function getPreviousMilestone(target: Milestone): number | null {
  const idx = MILESTONES.indexOf(target);
  if (idx <= 0) return null;
  return MILESTONES[idx - 1];
}
