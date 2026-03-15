import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { Eye, Target, Flag, CheckCircle2, TrendingUp } from "lucide-react";
import { getCompletionStats } from "../../utils/trackingStats";

interface StatCard {
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  completed: number;
  total: number;
  percentage: number;
}

export default function OverviewCards() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    const [visionsResult, goalsResult, objectivesResult, tasksResult] =
      await Promise.all([
        supabase.from("visions").select("status").eq("user_id", user!.id),
        supabase.from("goals").select("status").eq("user_id", user!.id),
        supabase.from("objectives").select("status").eq("user_id", user!.id),
        supabase.from("tasks").select("status").eq("user_id", user!.id),
      ]);

    const visionStats = getCompletionStats(
      (visionsResult.data || []).map((v) => ({
        status: v.status || "not_started",
      })),
    );
    const goalStats = getCompletionStats(
      (goalsResult.data || []).map((g) => ({
        status: g.status || "not_started",
      })),
    );
    const objectiveStats = getCompletionStats(
      (objectivesResult.data || []).map((o) => ({
        status: o.status || "not_started",
      })),
    );
    const taskStats = getCompletionStats(
      (tasksResult.data || []).map((t) => ({
        status: t.status || "not_started",
      })),
    );

    const allItemsCount =
      visionStats.total +
      goalStats.total +
      objectiveStats.total +
      taskStats.total;
    const allCompletedCount =
      visionStats.completed +
      goalStats.completed +
      objectiveStats.completed +
      taskStats.completed;
    const overallPercentage =
      allItemsCount > 0
        ? Math.round((allCompletedCount / allItemsCount) * 100)
        : 0;

    setStats([
      {
        title: t("tracking.overallProgress"),
        icon: TrendingUp,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        completed: allCompletedCount,
        total: allItemsCount,
        percentage: overallPercentage,
      },
      {
        title: t("tracking.visions"),
        icon: Eye,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        ...visionStats,
      },
      {
        title: t("tracking.goals"),
        icon: Target,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        ...goalStats,
      },
      {
        title: t("tracking.objectives"),
        icon: Flag,
        color: "text-green-600",
        bgColor: "bg-green-100",
        ...objectiveStats,
      },
      {
        title: t("tracking.tasks"),
        icon: CheckCircle2,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        ...taskStats,
      },
    ]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-12 bg-gray-200 rounded mb-4" />
            <div className="h-8 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {stat.percentage}%
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              {stat.title}
            </h3>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {stat.completed} {t("tracking.of")} {stat.total}
              </span>
              <span>{t("tracking.completed")}</span>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  stat.percentage === 100
                    ? "bg-green-600"
                    : stat.color.replace("text-", "bg-")
                }`}
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
