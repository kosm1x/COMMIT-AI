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
  const prevWeekStart = getWeekStart(
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
  );

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
      // Parallel queries for this week's stats
      const [tasksResult, journalResult, goalsResult, prevDigest] =
        await Promise.all([
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
            .select("stats")
            .eq("user_id", user_id)
            .eq("week_start", prevWeekStart)
            .maybeSingle(),
        ]);

      const tasksCreated = tasksResult.count ?? 0;
      const tasksCompleted = (tasksResult.data ?? []).filter(
        (t) => t.status === "completed",
      ).length;
      const journalEntries = journalResult.data?.length ?? 0;
      const activeGoals = goalsResult.data?.length ?? 0;

      // Journal streak (consecutive days backwards from today)
      const journalDates = (journalResult.data ?? []).map(
        (r) => r.entry_date as string,
      );
      const journalStreak = calculateStreak(journalDates, now);

      // Previous week deltas
      const prevStats = (prevDigest.data?.stats ?? {}) as Record<
        string,
        number
      >;
      const tasksDelta = tasksCompleted - (prevStats.tasks_completed ?? 0);
      const journalDelta = journalEntries - (prevStats.journal_entries ?? 0);

      const stats = {
        tasks_completed: tasksCompleted,
        tasks_created: tasksCreated,
        journal_entries: journalEntries,
        journal_streak: journalStreak,
        active_goals: activeGoals,
        tasks_delta: tasksDelta,
        journal_delta: journalDelta,
      };

      // Generate AI insights (graceful degradation)
      let insights: string[] = [];
      try {
        insights = await generateInsights(stats, goalsResult.data ?? []);
      } catch (err) {
        console.error(`[weekly-digest] LLM failed for user ${user_id}:`, err);
      }

      // Upsert digest
      await supabase.from("weekly_digests").upsert(
        {
          user_id,
          week_start: weekStart,
          stats,
          insights,
        },
        { onConflict: "user_id,week_start" },
      );

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

async function generateInsights(
  stats: Record<string, number>,
  goals: { id: string; title: string; status: string }[],
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

  const prompt = `You are a personal growth coach. Given these weekly stats, generate exactly 2-3 brief encouraging insights (1 sentence each). Return ONLY a JSON array of strings, no markdown.

Stats:
- Tasks completed: ${stats.tasks_completed} (${deltaSign(stats.tasks_delta)} from last week)
- Journal entries: ${stats.journal_entries} (${deltaSign(stats.journal_delta)} from last week)
- Current journal streak: ${stats.journal_streak} days
- Active goals: ${stats.active_goals}${goalList ? ` (${goalList})` : ""}`;

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
