import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { calculateJournalStreak } from "../../utils/streakCalculator";
import {
  Lightbulb,
  Flame,
  CheckCircle2,
  Target,
  CalendarClock,
  Sparkles,
} from "lucide-react";

interface WeeklyStats {
  tasks_completed: number;
  tasks_delta: number;
  journal_entries: number;
  journal_streak: number;
  active_goals: number;
}

export default function InsightsCard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [tasksDueToday, setTasksDueToday] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [journalResult, tasksResult, digestResult] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("entry_date")
          .eq("user_id", user.id)
          .gte("entry_date", thirtyDaysAgo)
          .order("entry_date", { ascending: false }),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("due_date", today)
          .neq("status", "completed"),
        supabase
          .from("weekly_digests")
          .select("stats, insights")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Journal streak
      const dates = (journalResult.data ?? []).map(
        (r) => r.entry_date as string,
      );
      const streakResult = calculateJournalStreak(dates);
      setStreak({
        current: streakResult.current,
        longest: streakResult.longest,
      });

      // Tasks due
      setTasksDueToday(tasksResult.count ?? 0);

      // Weekly digest
      if (digestResult.data) {
        const stats = digestResult.data.stats as unknown as WeeklyStats;
        setWeeklyStats(stats);
        setInsights((digestResult.data.insights as string[]) ?? []);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  const deltaText = (delta: number) => {
    if (delta === 0) return "";
    const sign = delta > 0 ? "+" : "";
    return ` (${sign}${delta} ${t("tracking.fromLastWeek") || "from last week"})`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-semibold text-text-primary">
          {t("tracking.weeklyInsights") || "Weekly Insights"}
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        {/* Journal streak */}
        {streak.current > 0 && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <span>
              {streak.current}-{t("tracking.days") || "day"}{" "}
              {t("tracking.journalStreak") || "journal streak"}
              {streak.current === streak.longest && streak.longest > 1 && (
                <span className="text-orange-500 font-medium ml-1">
                  — {t("tracking.longestStreak") || "your longest yet!"}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Tasks completed this week */}
        {weeklyStats && (
          <div className="flex items-center gap-2 text-text-secondary">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span>
              {weeklyStats.tasks_completed}{" "}
              {t("tracking.tasksCompleted") || "tasks completed"}
              {deltaText(weeklyStats.tasks_delta)}
            </span>
          </div>
        )}

        {/* Active goals */}
        {weeklyStats && weeklyStats.active_goals > 0 && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Target className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              {weeklyStats.active_goals}{" "}
              {t("tracking.activeGoals") || "active goals"}
            </span>
          </div>
        )}

        {/* AI insights */}
        {insights.length > 0 ? (
          insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-text-secondary">
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <span className="italic">{insight}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 text-text-tertiary">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-xs">
              {t("tracking.insightsUnavailable") ||
                "AI insights will appear after your first full week."}
            </span>
          </div>
        )}

        {/* Tasks due today */}
        <div className="flex items-center gap-2 text-text-secondary">
          <CalendarClock className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            {tasksDueToday > 0
              ? `${tasksDueToday} ${t("tracking.tasksDueToday") || "tasks due today"}`
              : t("tracking.noTasksDueToday") || "No tasks due today"}
          </span>
        </div>
      </div>
    </div>
  );
}
