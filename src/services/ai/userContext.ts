import { supabase } from "../../lib/supabase";
import { logger } from "../../utils/logger";
import { calculateActivityStreak } from "../../utils/streakCalculator";
import { detectPatterns } from "../../utils/patternDetector";
import type { Patterns } from "../../utils/patternDetector";

export interface UserAIContext {
  recentJournalEntries: {
    content: string;
    date: string;
    primaryEmotion?: string;
  }[];
  activeObjectives: { title: string; status: string; progress: number }[];
  taskSummary: {
    completedThisWeek: number;
    pendingThisWeek: number;
    total: number;
  };
  streakDays: number;
  preferredLanguage: string;
  aiFeedback?: {
    accepted_types?: Record<string, number>;
    rejected_types?: Record<string, number>;
  };
  patterns?: Patterns | null;
  feedbackSummary?: string | null;
}

interface CacheEntry {
  context: UserAIContext;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const contextCache = new Map<string, CacheEntry>();

export function invalidateContextCache(userId: string): void {
  contextCache.delete(userId);
}

export async function buildUserContext(
  userId: string,
): Promise<UserAIContext | null> {
  if (!userId) return null;

  const cached = contextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.context;
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const mondayOfWeek = new Date(now);
    mondayOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    mondayOfWeek.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      journalResult,
      goalsResult,
      tasksCompletedResult,
      tasksPendingResult,
      prefsResult,
      emotionsResult,
      digestsResult,
      journal30dResult,
    ] = await Promise.all([
      // 1. Last 7 days of journal entries + primary emotion
      supabase
        .from("journal_entries")
        .select("content, created_at, primary_emotion")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(7),

      // 2. Active goals with task progress
      supabase
        .from("goals")
        .select("id, title, status")
        .eq("user_id", userId)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5),

      // 3. Tasks completed this week
      supabase
        .from("tasks")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("completed_at", mondayOfWeek.toISOString()),

      // 4. Tasks pending (not completed)
      supabase
        .from("tasks")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .neq("status", "completed"),

      // 5. AI feedback from preferences
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single(),

      // 6. Emotions from journal entries (last 14 with primary_emotion)
      supabase
        .from("journal_entries")
        .select("primary_emotion, created_at")
        .eq("user_id", userId)
        .not("primary_emotion", "is", null)
        .order("created_at", { ascending: false })
        .limit(14),

      // 7. Weekly digests (last 4 weeks for improvement tracking)
      supabase
        .from("weekly_digests")
        .select("week_start, stats")
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .limit(4),

      // 8. Journal dates (last 30 days for pattern detection)
      supabase
        .from("journal_entries")
        .select("entry_date")
        .eq("user_id", userId)
        .gte("entry_date", thirtyDaysAgo.toISOString().slice(0, 10))
        .order("entry_date", { ascending: false }),
    ]);

    // Build journal entries (keep ISO date for streak calc, formatted date for display)
    const journalRows = journalResult.data ?? [];
    const recentJournalEntries = journalRows.map((e) => ({
      content:
        typeof e.content === "string"
          ? e.content.slice(0, 200)
          : String(e.content ?? "").slice(0, 200),
      date: new Date(e.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      primaryEmotion: e.primary_emotion ?? undefined,
    }));

    // Build active goals with task progress (parallel per-goal queries)
    const activeObjectives = await Promise.all(
      (goalsResult.data ?? []).map(async (goal) => {
        const [{ count: totalTasks }, { count: completedTasks }] =
          await Promise.all([
            supabase
              .from("tasks")
              .select("id", { count: "exact" })
              .eq("user_id", userId)
              .eq("goal_id", goal.id),
            supabase
              .from("tasks")
              .select("id", { count: "exact" })
              .eq("user_id", userId)
              .eq("goal_id", goal.id)
              .eq("status", "completed"),
          ]);
        const total = totalTasks ?? 0;
        const completed = completedTasks ?? 0;
        return {
          title: goal.title,
          status: goal.status ?? "not_started",
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    // Calculate streak from journal entries + task completions
    const { data: completedTaskDates } = await supabase
      .from("tasks")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", thirtyDaysAgo.toISOString())
      .order("completed_at", { ascending: false });

    const journalDateStrs = journalRows.map((r) =>
      new Date(r.created_at).toISOString().slice(0, 10),
    );
    const taskDateStrs = (completedTaskDates ?? [])
      .filter((r) => r.completed_at)
      .map((r) => new Date(r.completed_at!).toISOString().slice(0, 10));
    const streakResult = calculateActivityStreak(journalDateStrs, taskDateStrs);
    const streakDays = streakResult.current;

    // Extract ai_feedback from preferences (column added in migration 20260401000001)
    const prefsRaw = prefsResult.data as Record<string, unknown> | null;
    const aiFeedback = prefsRaw?.ai_feedback as
      | UserAIContext["aiFeedback"]
      | undefined;

    // Detect behavioral patterns (v4.1)
    const journal30dDates = (journal30dResult.data ?? []).map(
      (r) => r.entry_date as string,
    );
    const emotions = (emotionsResult.data ?? [])
      .filter((r) => r.primary_emotion)
      .map((r) => ({
        date: new Date(r.created_at).toISOString().slice(0, 10),
        emotion: r.primary_emotion!,
      }));
    const digests = (digestsResult.data ?? []).map((d) => ({
      week_start: d.week_start as string,
      stats: (d.stats ?? {}) as Record<string, number>,
    }));
    const patterns = detectPatterns({
      journalDates: journal30dDates,
      taskCompletionDates: taskDateStrs,
      emotions,
      weeklyDigests: digests,
    });

    // Build feedback summary (v4.1)
    const feedbackSummary = buildFeedbackSummary(aiFeedback);

    const context: UserAIContext = {
      recentJournalEntries,
      activeObjectives,
      taskSummary: {
        completedThisWeek: tasksCompletedResult.count ?? 0,
        pendingThisWeek: tasksPendingResult.count ?? 0,
        total:
          (tasksCompletedResult.count ?? 0) + (tasksPendingResult.count ?? 0),
      },
      streakDays,
      preferredLanguage: "en",
      aiFeedback: aiFeedback ?? undefined,
      patterns,
      feedbackSummary,
    };

    contextCache.set(userId, { context, timestamp: Date.now() });
    return context;
  } catch (error) {
    logger.error("Failed to build user AI context:", error);
    return null;
  }
}

export function formatContextAsSystemPrompt(ctx: UserAIContext): string {
  const lines: string[] = [
    "You are assisting a user with their personal growth journey. Here is their current context:",
    "",
  ];

  if (ctx.recentJournalEntries.length > 0) {
    lines.push("## Recent Journal (last 7 days)");
    for (const entry of ctx.recentJournalEntries) {
      const emotion = entry.primaryEmotion
        ? ` (primary emotion: ${entry.primaryEmotion})`
        : "";
      const snippet = entry.content.replace(/\n/g, " ").slice(0, 100);
      lines.push(`- ${entry.date}: "${snippet}..."${emotion}`);
    }
    lines.push("");
  }

  if (ctx.activeObjectives.length > 0) {
    lines.push("## Active Goals & Progress");
    for (const obj of ctx.activeObjectives) {
      lines.push(
        `- "${obj.title}" — ${obj.progress}% complete (${obj.status})`,
      );
    }
    lines.push("");
  }

  lines.push("## This Week");
  lines.push(`- Tasks completed: ${ctx.taskSummary.completedThisWeek}`);
  lines.push(`- Tasks pending: ${ctx.taskSummary.pendingThisWeek}`);
  lines.push(`- Current streak: ${ctx.streakDays} days`);
  lines.push("");

  // Behavioral patterns (v4.1)
  if (ctx.patterns) {
    const p = ctx.patterns;
    const patternLines: string[] = [];
    if (p.mostActiveDay)
      patternLines.push(
        `- Most productive day: ${p.mostActiveDay.day} (${p.mostActiveDay.count} tasks)`,
      );
    if (p.mostJournalingDay)
      patternLines.push(
        `- Most reflective day: ${p.mostJournalingDay.day} (${p.mostJournalingDay.count} entries)`,
      );
    if (p.emotionTrend)
      patternLines.push(
        `- Emotion trend: "${p.emotionTrend.emotion}" is ${p.emotionTrend.direction}`,
      );
    if (p.consecutiveWeeksImproving > 0)
      patternLines.push(
        `- ${p.consecutiveWeeksImproving} consecutive weeks of task improvement`,
      );
    if (patternLines.length > 0) {
      lines.push("## Your Patterns");
      lines.push(...patternLines);
      lines.push("");
    }
  }

  // AI feedback preferences (v4.1)
  if (ctx.feedbackSummary) {
    lines.push("## AI Feedback Preferences");
    lines.push(ctx.feedbackSummary);
    lines.push("");
  }

  lines.push(
    "Use this context to personalize your responses. Reference the user's goals, emotions, patterns, and progress where relevant. Adapt your tone based on their feedback preferences.",
  );

  return lines.join("\n");
}

/**
 * Convenience: get the system prompt string for the current authenticated user.
 * Returns undefined if no session or context build fails (callLLM handles undefined gracefully).
 */
/**
 * Build a human-readable summary of AI feedback preferences.
 */
function buildFeedbackSummary(
  feedback: UserAIContext["aiFeedback"] | undefined,
): string | null {
  if (!feedback) return null;

  const accepted = feedback.accepted_types ?? {};
  const rejected = feedback.rejected_types ?? {};
  const lines: string[] = [];

  const allTypes = new Set([
    ...Object.keys(accepted),
    ...Object.keys(rejected),
  ]);
  if (allTypes.size === 0) return null;

  for (const fn of allTypes) {
    const acc = accepted[fn] ?? 0;
    const rej = rejected[fn] ?? 0;
    const total = acc + rej;
    if (total < 3) continue; // Not enough data

    const label = fn.replace(/_/g, " ");
    const rate = Math.round((acc / total) * 100);
    if (rate >= 70) {
      lines.push(
        `- User finds "${label}" suggestions helpful (${rate}% acceptance)`,
      );
    } else if (rate <= 30) {
      lines.push(
        `- User dislikes "${label}" suggestions (${100 - rate}% rejection) — prefer a different approach`,
      );
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export async function getSystemPromptForCurrentUser(): Promise<
  string | undefined
> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return undefined;
    const ctx = await buildUserContext(session.user.id);
    if (!ctx) return undefined;
    return formatContextAsSystemPrompt(ctx);
  } catch {
    return undefined;
  }
}
