import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UserNotifRow {
  user_id: string;
  notify_journal_reminder: boolean;
  notify_streak_alert: boolean;
  notify_task_due: boolean;
  reminder_hour: number;
  timezone: string | null;
  onboarding_day: number | null;
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: service role key only (called by pg_cron, not users)
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
  const currentHourUTC = now.getUTCHours();

  console.log(`[push-notify] Running at UTC hour ${currentHourUTC}`);

  // Find users whose reminder_hour matches current hour in their timezone
  // For simplicity, we check users whose reminder_hour == current local hour
  // A proper implementation would convert timezone offsets, but this covers the common case
  const { data: users, error: usersError } = await supabase
    .from("user_preferences")
    .select(
      "user_id, notify_journal_reminder, notify_streak_alert, notify_task_due, reminder_hour, timezone, onboarding_day, onboarding_started_at, onboarding_completed_at",
    )
    .or(
      `notify_journal_reminder.eq.true,notify_streak_alert.eq.true,notify_task_due.eq.true`,
    );

  if (usersError || !users) {
    console.error("[push-notify] Failed to query users:", usersError);
    return new Response(JSON.stringify({ error: "Failed to query users" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  const today = now.toISOString().split("T")[0];

  for (const user of users as UserNotifRow[]) {
    // Check if current UTC hour matches user's reminder_hour in their timezone
    const userHour = getUserLocalHour(now, user.timezone);
    if (userHour !== user.reminder_hour) continue;

    const notifications: {
      title: string;
      body: string;
      page: string;
      tag: string;
    }[] = [];

    // Journal reminder: if no entry today
    if (user.notify_journal_reminder) {
      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .gte("created_at", `${today}T00:00:00Z`);

      if (!count || count === 0) {
        notifications.push({
          title: "Time to reflect",
          body: "How was your day? Take a moment to write.",
          page: "/journal",
          tag: "journal-reminder",
        });
      }
    }

    // Streak alert: if streak > 0 and no entry today (2 hours before reminder)
    if (
      user.notify_streak_alert &&
      userHour === (user.reminder_hour - 2 + 24) % 24
    ) {
      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .gte("created_at", `${today}T00:00:00Z`);

      if (!count || count === 0) {
        notifications.push({
          title: "Keep your streak!",
          body: "Don't break your journal streak!",
          page: "/journal",
          tag: "streak-alert",
        });
      }
    }

    // Task due: tasks due today
    if (user.notify_task_due) {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .eq("due_date", today)
        .neq("status", "completed");

      if (count && count > 0) {
        notifications.push({
          title: "Tasks due today",
          body: `You have ${count} task${count > 1 ? "s" : ""} due today.`,
          page: "/objectives",
          tag: "task-due",
        });
      }
    }

    // Onboarding nudge: if user has started but hasn't caught up
    if (
      user.onboarding_started_at &&
      !user.onboarding_completed_at &&
      user.onboarding_day !== null
    ) {
      const startedAt = new Date(user.onboarding_started_at).getTime();
      const daysSinceStart = Math.floor(
        (now.getTime() - startedAt) / (24 * 60 * 60 * 1000),
      );
      const availableDay = Math.min(7, daysSinceStart + 1);

      if (user.onboarding_day < availableDay) {
        notifications.push({
          title: `Day ${user.onboarding_day + 1} is ready`,
          body: "Continue your COMMIT journey.",
          page: "/objectives",
          tag: "onboarding-nudge",
        });
      }
    }

    // Send notifications via Web Push tokens
    if (notifications.length > 0) {
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token, platform")
        .eq("user_id", user.user_id);

      if (tokens && tokens.length > 0) {
        for (const notification of notifications) {
          for (const tokenRow of tokens) {
            if (tokenRow.platform === "web") {
              // Web Push delivery would go here (requires VAPID private key + crypto)
              console.log(
                `[push-notify] Would send web push to user ${user.user_id}: ${notification.title}`,
              );
              sent++;
            } else {
              // Native push (FCM/APNs) would go here
              console.log(
                `[push-notify] Would send ${tokenRow.platform} push to user ${user.user_id}: ${notification.title}`,
              );
              sent++;
            }
          }
        }
      } else {
        console.log(
          `[push-notify] No tokens for user ${user.user_id}, skipping ${notifications.length} notifications`,
        );
      }
    }
  }

  console.log(`[push-notify] Completed. ${sent} notifications queued.`);

  return new Response(JSON.stringify({ ok: true, sent }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

/**
 * Get the current local hour for a user given their timezone.
 * Falls back to UTC if timezone is null or invalid.
 */
function getUserLocalHour(now: Date, timezone: string | null): number {
  if (!timezone) return now.getUTCHours();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return now.getUTCHours();
  }
}
