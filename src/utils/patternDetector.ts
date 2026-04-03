import { calculateJournalStreak } from "./streakCalculator";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface Patterns {
  mostActiveDay: { day: string; count: number } | null;
  mostJournalingDay: { day: string; count: number } | null;
  emotionTrend: {
    emotion: string;
    direction: "rising" | "falling" | "stable";
    count: number;
  } | null;
  consecutiveWeeksImproving: number;
  longestStreak: number;
}

interface PatternInput {
  journalDates: string[];
  taskCompletionDates: string[];
  emotions: { date: string; emotion: string }[];
  weeklyDigests: { week_start: string; stats: Record<string, number> }[];
}

/**
 * Detect behavioral patterns from temporal data.
 */
export function detectPatterns(data: PatternInput): Patterns {
  return {
    mostActiveDay: findPeakDay(data.taskCompletionDates),
    mostJournalingDay: findPeakDay(data.journalDates),
    emotionTrend: detectEmotionTrend(data.emotions),
    consecutiveWeeksImproving: countConsecutiveImprovement(data.weeklyDigests),
    longestStreak: calculateJournalStreak(data.journalDates).longest,
  };
}

/**
 * Find the day of week with the most activity.
 * Requires at least 7 data points to be meaningful.
 */
function findPeakDay(dates: string[]): { day: string; count: number } | null {
  if (dates.length < 7) return null;

  const counts = new Array(7).fill(0);
  for (const d of dates) {
    const dayOfWeek = new Date(d + "T12:00:00").getDay();
    counts[dayOfWeek]++;
  }

  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (counts[i] > counts[maxIdx]) maxIdx = i;
  }

  if (counts[maxIdx] === 0) return null;
  return { day: DAYS[maxIdx], count: counts[maxIdx] };
}

/**
 * Detect if a primary emotion is trending up or down.
 * Compares the last 7 entries to the prior 7.
 */
function detectEmotionTrend(
  emotions: { date: string; emotion: string }[],
): Patterns["emotionTrend"] {
  if (emotions.length < 7) return null;

  const sorted = [...emotions].sort((a, b) => b.date.localeCompare(a.date));
  const recent = sorted.slice(0, 7);
  const prior = sorted.slice(7, 14);

  // Count emotions in recent window
  const recentCounts = new Map<string, number>();
  for (const e of recent) {
    recentCounts.set(e.emotion, (recentCounts.get(e.emotion) ?? 0) + 1);
  }

  // Find dominant recent emotion
  let topEmotion = "";
  let topCount = 0;
  for (const [emotion, count] of recentCounts) {
    if (count > topCount) {
      topEmotion = emotion;
      topCount = count;
    }
  }

  if (topCount < 3) return null; // Not dominant enough

  // Count same emotion in prior window
  const priorCount = prior.filter((e) => e.emotion === topEmotion).length;

  let direction: "rising" | "falling" | "stable" = "stable";
  if (topCount >= priorCount + 2) direction = "rising";
  else if (topCount <= priorCount - 2) direction = "falling";

  return { emotion: topEmotion, direction, count: topCount };
}

/**
 * Count consecutive weeks where tasks_completed grew (or stayed equal).
 * Walks digests from most recent backwards.
 */
function countConsecutiveImprovement(
  digests: { week_start: string; stats: Record<string, number> }[],
): number {
  if (digests.length < 2) return 0;

  const sorted = [...digests].sort((a, b) =>
    b.week_start.localeCompare(a.week_start),
  );

  let consecutive = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].stats.tasks_completed ?? 0;
    const previous = sorted[i + 1].stats.tasks_completed ?? 0;
    if (current >= previous) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}
