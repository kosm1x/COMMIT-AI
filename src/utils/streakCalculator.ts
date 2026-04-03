export interface StreakResult {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

const DEFAULT_MILESTONES = [3, 7, 14, 30, 60, 100];

/**
 * Calculate journal streak from an array of YYYY-MM-DD date strings.
 */
export function calculateJournalStreak(journalDates: string[]): StreakResult {
  return calculateStreak(journalDates);
}

/**
 * Calculate activity streak from journal dates + task completion dates combined.
 */
export function calculateActivityStreak(
  journalDates: string[],
  taskDates: string[],
): StreakResult {
  const combined = [...journalDates, ...taskDates];
  return calculateStreak(combined);
}

/**
 * Detect if a streak has hit a milestone. Returns the milestone or null.
 */
export function detectMilestone(
  streak: number,
  milestones: number[] = DEFAULT_MILESTONES,
): number | null {
  if (milestones.includes(streak)) return streak;
  return null;
}

/**
 * Core streak calculation. Deduplicates dates, counts consecutive days
 * backwards from today, and finds the longest run in the full dataset.
 */
function calculateStreak(dates: string[]): StreakResult {
  if (dates.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null };
  }

  // Deduplicate and sort descending
  const unique = [...new Set(dates)].sort().reverse();

  // Current streak: count consecutive days backwards from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateSet = new Set(unique);

  let current = 0;
  for (let i = 0; i < 365; i++) {
    const check = new Date(today);
    check.setDate(today.getDate() - i);
    const key = check.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      current++;
    } else if (i > 0) {
      // Allow today to be missing (day not over yet)
      break;
    }
  }

  // Longest streak: scan sorted dates for longest consecutive run
  const sorted = [...new Set(dates)].sort();
  let longest = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diffDays === 1) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run, current);

  return {
    current,
    longest,
    lastActiveDate: unique[0] ?? null,
  };
}
