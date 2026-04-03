import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: service role key only (called by pg_cron)
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const weekStart = getWeekStart(now);

  console.log(`[weekly-digest] Running for week starting ${weekStart}`);

  // Find users with weekly digest enabled
  const { data: users, error: usersError } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("notify_weekly_digest", true);

  if (usersError || !users) {
    console.error("[weekly-digest] Failed to query users:", usersError);
    return new Response(JSON.stringify({ error: "Failed to query users" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let generated = 0;

  for (const { user_id } of users) {
    try {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Parallel queries: this week's stats + 4 weeks of history + patterns
      const [
        tasksResult,
        journalResult,
        goalsResult,
        recentDigests,
        taskDates30d,
        journalDates30d,
        emotionsResult,
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, status, completed_at, created_at", { count: "exact" })
          .eq("user_id", user_id)
          .gte("created_at", `${weekStart}T00:00:00Z`),
        supabase
          .from("journal_entries")
          .select("entry_date")
          .eq("user_id", user_id)
          .gte("entry_date", weekStart)
          .order("entry_date", { ascending: false }),
        supabase
          .from("goals")
          .select("id, title, status")
          .eq("user_id", user_id)
          .neq("status", "completed"),
        supabase
          .from("weekly_digests")
          .select("week_start, stats")
          .eq("user_id", user_id)
          .order("week_start", { ascending: false })
          .limit(4),
        supabase
          .from("tasks")
          .select("completed_at")
          .eq("user_id", user_id)
          .eq("status", "completed")
          .gte("completed_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("journal_entries")
          .select("entry_date")
          .eq("user_id", user_id)
          .gte("entry_date", thirtyDaysAgo.toISOString().slice(0, 10)),
        supabase
          .from("journal_entries")
          .select("primary_emotion, created_at")
          .eq("user_id", user_id)
          .not("primary_emotion", "is", null)
          .order("created_at", { ascending: false })
          .limit(14),
      ]);

      const tasksCreated = tasksResult.count ?? 0;
      const tasksCompleted = (tasksResult.data ?? []).filter(
        (t) => t.status === "completed",
      ).length;
      const journalEntries = journalResult.data?.length ?? 0;
      const activeGoals = goalsResult.data?.length ?? 0;

      // Journal streak
      const journalDates = (journalResult.data ?? []).map(
        (r) => r.entry_date as string,
      );
      const journalStreak = calculateStreak(journalDates, now);

      // Multi-week analysis from last 4 digests
      const digests = (recentDigests.data ?? []) as {
        week_start: string;
        stats: Record<string, number>;
      }[];
      const prevStats = digests.length > 0 ? digests[0].stats : {};
      const tasksDelta = tasksCompleted - (prevStats.tasks_completed ?? 0);
      const journalDelta = journalEntries - (prevStats.journal_entries ?? 0);

      // Consecutive weeks improving
      let consecutiveWeeksImproving = 0;
      for (let i = 0; i < digests.length - 1; i++) {
        if (
          (digests[i].stats.tasks_completed ?? 0) >=
          (digests[i + 1].stats.tasks_completed ?? 0)
        ) {
          consecutiveWeeksImproving++;
        } else break;
      }

      // 4-week average
      const fourWeekAvg =
        digests.length > 0
          ? digests.reduce(
              (sum, d) => sum + (d.stats.tasks_completed ?? 0),
              0,
            ) / digests.length
          : 0;

      // Day-of-week patterns
      const taskDateStrs = (taskDates30d.data ?? [])
        .filter((r) => r.completed_at)
        .map((r) => r.completed_at!.slice(0, 10));
      const journalDateStrs = (journalDates30d.data ?? []).map(
        (r) => r.entry_date as string,
      );
      const mostProductiveDay = findPeakDay(taskDateStrs);
      const mostReflectiveDay = findPeakDay(journalDateStrs);

      // Emotion trend
      const emotions = (emotionsResult.data ?? []).filter(
        (r) => r.primary_emotion,
      );
      const emotionTrend = detectEmotionTrend(emotions);

      const stats = {
        tasks_completed: tasksCompleted,
        tasks_created: tasksCreated,
        journal_entries: journalEntries,
        journal_streak: journalStreak,
        active_goals: activeGoals,
        tasks_delta: tasksDelta,
        journal_delta: journalDelta,
        consecutive_weeks_improving: consecutiveWeeksImproving,
        four_week_avg: Math.round(fourWeekAvg * 10) / 10,
      };

      // Generate AI insights with pattern context (graceful degradation)
      let insights: string[] = [];
      try {
        insights = await generateInsights(stats, goalsResult.data ?? [], {
          mostProductiveDay,
          mostReflectiveDay,
          emotionTrend,
          consecutiveWeeksImproving,
        });
      } catch (err) {
        console.error(`[weekly-digest] LLM failed for user ${user_id}:`, err);
      }

      // Upsert digest
      const { error: upsertError } = await supabase
        .from("weekly_digests")
        .upsert(
          {
            user_id,
            week_start: weekStart,
            stats,
            insights,
          },
          { onConflict: "user_id,week_start" },
        );

      if (upsertError) {
        console.error(
          `[weekly-digest] Upsert failed for user ${user_id}:`,
          upsertError,
        );
        continue;
      }

      generated++;
      console.log(
        `[weekly-digest] Generated for user ${user_id}: ${tasksCompleted} tasks, ${journalEntries} entries, ${insights.length} insights`,
      );
    } catch (err) {
      console.error(`[weekly-digest] Error for user ${user_id}:`, err);
    }
  }

  console.log(
    `[weekly-digest] Done. ${generated}/${users.length} digests generated.`,
  );

  return new Response(JSON.stringify({ ok: true, generated }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ─── Helpers ────────────────────────────────────────────────────────

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function calculateStreak(dates: string[], now: Date): number {
  if (dates.length === 0) return 0;
  const dateSet = new Set(dates);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const check = new Date(today);
    check.setDate(today.getDate() - i);
    const key = check.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function findPeakDay(dates: string[]): string | null {
  if (dates.length < 7) return null;
  const counts = new Array(7).fill(0);
  for (const d of dates) {
    counts[new Date(d + "T12:00:00").getDay()]++;
  }
  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (counts[i] > counts[maxIdx]) maxIdx = i;
  }
  return counts[maxIdx] > 0 ? DAYS[maxIdx] : null;
}

function detectEmotionTrend(
  emotions: { primary_emotion: string | null; created_at: string }[],
): string | null {
  const valid = emotions.filter((e) => e.primary_emotion);
  if (valid.length < 7) return null;
  const recent = valid.slice(0, 7);
  const counts = new Map<string, number>();
  for (const e of recent) {
    counts.set(e.primary_emotion!, (counts.get(e.primary_emotion!) ?? 0) + 1);
  }
  let top = "";
  let topCount = 0;
  for (const [emotion, count] of counts) {
    if (count > topCount) {
      top = emotion;
      topCount = count;
    }
  }
  return topCount >= 3 ? top : null;
}

interface PatternContext {
  mostProductiveDay: string | null;
  mostReflectiveDay: string | null;
  emotionTrend: string | null;
  consecutiveWeeksImproving: number;
}

async function generateInsights(
  stats: Record<string, number>,
  goals: { id: string; title: string; status: string }[],
  patterns: PatternContext,
): Promise<string[]> {
  const endpoint = Deno.env.get("LLM_ENDPOINT");
  const apiKey = Deno.env.get("LLM_API_KEY") || Deno.env.get("GROQ_API_KEY");
  const model = Deno.env.get("LLM_MODEL") || "qwen/qwen3-32b";

  if (!endpoint || !apiKey) return [];

  const goalList = goals
    .slice(0, 5)
    .map((g) => g.title)
    .join(", ");
  const deltaSign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  let patternBlock = "";
  const pLines: string[] = [];
  if (patterns.mostProductiveDay)
    pLines.push(`- Most productive day: ${patterns.mostProductiveDay}`);
  if (patterns.mostReflectiveDay)
    pLines.push(`- Most reflective day: ${patterns.mostReflectiveDay}`);
  if (patterns.emotionTrend)
    pLines.push(`- Dominant recent emotion: ${patterns.emotionTrend}`);
  if (patterns.consecutiveWeeksImproving > 0)
    pLines.push(
      `- ${patterns.consecutiveWeeksImproving} consecutive weeks of task improvement`,
    );
  if (pLines.length > 0) {
    patternBlock = `\n\nBehavioral patterns:\n${pLines.join("\n")}`;
  }

  const prompt = `You are a personal growth coach. Given these weekly stats and behavioral patterns, generate exactly 2-3 brief encouraging insights (1 sentence each). Reference patterns and celebrate sustained progress when present. Return ONLY a JSON array of strings, no markdown.

Stats:
- Tasks completed: ${stats.tasks_completed} (${deltaSign(stats.tasks_delta)} from last week, 4-week avg: ${stats.four_week_avg})
- Journal entries: ${stats.journal_entries} (${deltaSign(stats.journal_delta)} from last week)
- Current journal streak: ${stats.journal_streak} days
- Active goals: ${stats.active_goals}${goalList ? ` (${goalList})` : ""}${patternBlock}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (
      Array.isArray(parsed) &&
      parsed.every((s: unknown) => typeof s === "string")
    ) {
      return parsed.slice(0, 3);
    }
  } catch {
    // LLM returned non-JSON — graceful degradation
  }

  return [];
}
