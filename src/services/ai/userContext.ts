import { supabase } from "../../lib/supabase";
import { logger } from "../../utils/logger";

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

    const [
      journalResult,
      goalsResult,
      tasksCompletedResult,
      tasksPendingResult,
      prefsResult,
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

    // Calculate streak — single batch query instead of 30 sequential calls
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: completedTaskDates } = await supabase
      .from("tasks")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", thirtyDaysAgo.toISOString())
      .order("completed_at", { ascending: false });

    // Build set of active days (YYYY-MM-DD) from journal entries + completed tasks
    const activeDays = new Set<string>();
    for (const row of journalRows) {
      activeDays.add(new Date(row.created_at).toISOString().slice(0, 10));
    }
    for (const row of completedTaskDates ?? []) {
      if (row.completed_at) {
        activeDays.add(new Date(row.completed_at).toISOString().slice(0, 10));
      }
    }

    // Count consecutive days backwards from today
    let streakDays = 0;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = checkDate.toISOString().slice(0, 10);
      if (activeDays.has(dateKey)) {
        streakDays++;
      } else if (i > 0) {
        break;
      }
    }

    // Extract ai_feedback from preferences (column added in migration 20260401000001)
    const prefsRaw = prefsResult.data as Record<string, unknown> | null;
    const aiFeedback = prefsRaw?.ai_feedback as
      | UserAIContext["aiFeedback"]
      | undefined;

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
  lines.push(
    "Use this context to personalize your responses. Reference the user's goals, emotions, and progress where relevant.",
  );

  return lines.join("\n");
}

/**
 * Convenience: get the system prompt string for the current authenticated user.
 * Returns undefined if no session or context build fails (callLLM handles undefined gracefully).
 */
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
