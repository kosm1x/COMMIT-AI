import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { TrendingUp, Calendar } from "lucide-react";
import {
  getStartOfWeek,
  getEndOfWeek,
  formatShortDate,
} from "../../utils/trackingStats";
import { logger } from '../../utils/logger';

interface DayStats {
  date: Date;
  completed: number;
  total: number;
}

interface WeeklyViewProps {
  selectedDate: Date;
}

export default function WeeklyView({ selectedDate }: WeeklyViewProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [weekStats, setWeekStats] = useState<DayStats[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState({ completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWeeklyData();
    }
  }, [user, selectedDate]);

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      const startOfWeek = getStartOfWeek(selectedDate);
      const endOfWeek = getEndOfWeek(selectedDate);

      // Fetch all tasks that are due in this week (non-recurring) - include status to check completion
      const { data: tasksDue } = await supabase
        .from("tasks")
        .select("id, status, completed_at, due_date")
        .eq("user_id", user!.id)
        .eq("is_recurring", false)
        .not("due_date", "is", null)
        .gte("due_date", startOfWeek.toISOString().split("T")[0])
        .lte("due_date", endOfWeek.toISOString().split("T")[0]);

      // Fetch all tasks completed in this week (non-recurring) - regardless of due date
      const { data: tasksCompleted } = await supabase
        .from("tasks")
        .select("id, status, completed_at, due_date")
        .eq("user_id", user!.id)
        .eq("is_recurring", false)
        .not("completed_at", "is", null)
        .gte("completed_at", startOfWeek.toISOString())
        .lte("completed_at", endOfWeek.toISOString());

      // Fetch recurring task completions for this week
      const { data: recurringCompletions } = await supabase
        .from("task_completions")
        .select("task_id, completion_date")
        .eq("user_id", user!.id)
        .gte("completion_date", startOfWeek.toISOString().split("T")[0])
        .lte("completion_date", endOfWeek.toISOString().split("T")[0]);

      const dailyStats: DayStats[] = [];

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        currentDay.setHours(0, 0, 0, 0);
        const nextDay = new Date(currentDay);
        nextDay.setDate(currentDay.getDate() + 1);
        const dayStr = currentDay.toISOString().split("T")[0];

        // Tasks due on this day
        const dayTasks = (tasksDue || []).filter((task) => {
          if (!task.due_date) return false;
          const taskDate = new Date(task.due_date);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate >= currentDay && taskDate < nextDay;
        });

        // Tasks completed on this day (regardless of due date)
        const completedOnDay = (tasksCompleted || []).filter((task) => {
          if (!task.completed_at) return false;
          const completedDate = new Date(task.completed_at);
          completedDate.setHours(0, 0, 0, 0);
          return completedDate >= currentDay && completedDate < nextDay;
        });

        // Add recurring task completions for this day
        const recurringCompletedCount = (recurringCompletions || []).filter(
          (rc) => rc.completion_date === dayStr,
        ).length;

        dailyStats.push({
          date: currentDay,
          completed: completedOnDay.length + recurringCompletedCount,
          total: dayTasks.length,
        });
      }

      // Calculate proper weekly totals:
      // Total = all unique tasks due during the week (non-recurring only)
      // Completed = tasks due during the week that have status 'completed' (non-recurring only)
      // Note: Recurring task completions are excluded from percentage calculation to avoid > 100%
      const uniqueTasksDue = new Set((tasksDue || []).map((t) => t.id));
      const tasksDueList = tasksDue || [];

      // Count tasks due during the week that are completed (by status) - non-recurring only
      const completedTasksDue = tasksDueList.filter(
        (t) => t.status === "completed",
      ).length;

      setWeekStats(dailyStats);
      setWeeklyTotals({
        completed: completedTasksDue,
        total: uniqueTasksDue.size,
      });
    } catch (error) {
      logger.error("Error loading weekly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const weekPercentage =
    weeklyTotals.total > 0
      ? Math.round((weeklyTotals.completed / weeklyTotals.total) * 100)
      : 0;

  const maxDailyTotal = Math.max(...weekStats.map((d) => d.total), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-text-primary">
          {t("tracking.weekOf")} {formatShortDate(getStartOfWeek(selectedDate))}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider">
              {t("tracking.weeklyCompletion")}
            </h3>
            <div className="text-2xl font-heading font-bold text-blue-600 dark:text-blue-400">
              {weekPercentage}%
            </div>
          </div>
          <div className="w-full bg-blue-200/50 dark:bg-blue-900/50 rounded-full h-3 mb-2">
            <div
              className="h-3 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${weekPercentage}%` }}
            />
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {weeklyTotals.completed} {t("tracking.of")} {weeklyTotals.total}{" "}
            {t("tracking.tasksCompletedThisWeek")}
          </p>
        </div>

        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 dark:bg-green-500 p-3 rounded-xl shadow-lg shadow-green-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-green-900 dark:text-green-100">
                {weeklyTotals.total > 0
                  ? (weeklyTotals.completed / 7).toFixed(1)
                  : "0.0"}
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                {t("tracking.avgTasksPerDay")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-heading font-bold text-text-primary mb-4">
          {t("tracking.dailyBreakdown")}
        </h3>
        <div className="grid grid-cols-7 gap-3">
          {weekStats.map((day, index) => {
            const dayPercentage =
              day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0;
            const isToday =
              day.date.toDateString() === new Date().toDateString();
            const barHeight =
              day.total > 0
                ? Math.max((day.total / maxDailyTotal) * 100, 20)
                : 20;

            return (
              <div
                key={index}
                className={`glass-card border-2 p-3 transition-all ${
                  isToday
                    ? "border-accent-primary shadow-md bg-accent-subtle/30 dark:bg-accent-subtle/10"
                    : "border-white/40 dark:border-white/10"
                }`}
              >
                <div className="text-center mb-3">
                  <div className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                    {(() => {
                      const weekday = day.date.getDay();
                      const dayKeys = [
                        "sun",
                        "mon",
                        "tue",
                        "wed",
                        "thu",
                        "fri",
                        "sat",
                      ];
                      return t(`tracking.${dayKeys[weekday]}`);
                    })()}
                  </div>
                  <div className="text-base font-heading font-bold text-text-primary mt-1">
                    {day.date.getDate()}
                  </div>
                </div>

                <div className="relative h-24 bg-white/30 dark:bg-white/5 rounded-lg flex items-end justify-center overflow-hidden border border-white/40 dark:border-white/10">
                  <div
                    className={`w-full transition-all duration-300 ${
                      dayPercentage === 100
                        ? "bg-green-500 dark:bg-green-600"
                        : "bg-blue-500 dark:bg-blue-600"
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs font-bold text-text-primary drop-shadow-sm">
                        {day.completed}/{day.total}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <div className="text-xs font-bold text-text-secondary">
                    {dayPercentage}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-6 border border-white/40 dark:border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-accent-primary" />
          <h3 className="text-lg font-heading font-bold text-text-primary">
            {t("tracking.weekSummary")}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-heading font-bold text-text-primary">
              {weeklyTotals.total}
            </div>
            <div className="text-sm text-text-secondary font-medium">
              {t("tracking.totalTasks")}
            </div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold text-green-600 dark:text-green-400">
              {weeklyTotals.completed}
            </div>
            <div className="text-sm text-text-secondary font-medium">
              {t("tracking.completed")}
            </div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold text-yellow-600 dark:text-yellow-400">
              {weeklyTotals.total - weeklyTotals.completed}
            </div>
            <div className="text-sm text-text-secondary font-medium">
              {t("tracking.remaining")}
            </div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold text-blue-600 dark:text-blue-400">
              {weekStats.filter((d) => d.completed > 0).length}
            </div>
            <div className="text-sm text-text-secondary font-medium">
              {t("tracking.activeDays")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
