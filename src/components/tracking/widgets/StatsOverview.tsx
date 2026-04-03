import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { CheckCircle2, Target, TrendingUp, Activity } from "lucide-react";
import { calculateActivityStreak } from "../../../utils/streakCalculator";

export default function StatsOverview() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
    completionRate: 0,
    streak: 0,
    activeGoals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    const [completedResult, totalResult, activeGoalsResult] = await Promise.all(
      [
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "completed"),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase
          .from("goals")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "in_progress"),
      ],
    );

    const completed = completedResult.count || 0;
    const total = totalResult.count || 0;
    const activeGoals = activeGoalsResult.count || 0;

    // Calculate streak from task completions
    const { data: recentCompletions } = await supabase
      .from("tasks")
      .select("completed_at")
      .eq("user_id", user!.id)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(30);

    const taskDates = (recentCompletions ?? [])
      .filter((t) => t.completed_at)
      .map((t) => new Date(t.completed_at!).toISOString().slice(0, 10));
    const streakResult = calculateActivityStreak([], taskDates);
    const streak = streakResult.current;

    setStats({
      completedTasks: completed,
      totalTasks: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      streak,
      activeGoals,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="glass-card p-5 border border-white/40 dark:border-white/10 h-32 animate-pulse bg-white/20 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="glass-card p-5 border border-white/40 dark:border-white/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <CheckCircle2 className="w-24 h-24 text-green-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">
              {t("tracking.completedTasks")}
            </span>
          </div>
          <div className="text-3xl font-heading font-bold text-text-primary">
            {stats.completedTasks}
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            {t("tracking.totalTasksFinished")}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 border border-white/40 dark:border-white/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Target className="w-24 h-24 text-blue-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Target className="w-5 h-5" />
            <span className="font-bold text-sm">
              {t("tracking.completionRate")}
            </span>
          </div>
          <div className="text-3xl font-heading font-bold text-text-primary">
            {stats.completionRate}%
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-5 border border-white/40 dark:border-white/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <TrendingUp className="w-24 h-24 text-orange-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold text-sm">
              {t("tracking.currentStreak")}
            </span>
          </div>
          <div className="text-3xl font-heading font-bold text-text-primary">
            {stats.streak}{" "}
            <span className="text-lg font-normal text-text-tertiary">
              {t("tracking.days")}
            </span>
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            {t("tracking.keepItUp")}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 border border-white/40 dark:border-white/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Activity className="w-24 h-24 text-purple-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Activity className="w-5 h-5" />
            <span className="font-bold text-sm">
              {t("tracking.activeGoals")}
            </span>
          </div>
          <div className="text-3xl font-heading font-bold text-text-primary">
            {stats.activeGoals}
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            {t("tracking.inProgressGoals")}
          </div>
        </div>
      </div>
    </div>
  );
}
