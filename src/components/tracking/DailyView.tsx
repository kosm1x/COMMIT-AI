import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Flag,
  AlertCircle,
  Flame,
  Link2,
} from "lucide-react";
import {
  getStartOfDay,
  getEndOfDay,
  formatDate,
} from "../../utils/trackingStats";
import { logger } from '../../utils/logger';

interface Task {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  priority: "high" | "medium" | "low";
  due_date: string | null;
  completed_at: string | null;
  objective_id: string | null;
  objectives?: { title: string };
}

interface DailyViewProps {
  selectedDate: Date;
}

export default function DailyView({ selectedDate }: DailyViewProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<Task[]>([]);
  const [recurringCompletedToday, setRecurringCompletedToday] = useState<
    Set<string>
  >(new Set());
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDailyData();
    }
  }, [user, selectedDate]);

  const loadDailyData = async () => {
    setLoading(true);
    try {
      const startOfDay = getStartOfDay(selectedDate);
      const endOfDay = getEndOfDay(selectedDate);
      const now = new Date();

      const today = selectedDate.toISOString().split("T")[0];

      const [
        tasksResult,
        completedResult,
        overdueResult,
        recurringCompletionsResult,
        recurringTasksResult,
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, due_date, completed_at, objective_id, is_recurring, objectives(title)",
          )
          .eq("user_id", user!.id)
          .eq("is_recurring", false)
          .lte("due_date", endOfDay.toISOString().split("T")[0])
          .gte("due_date", startOfDay.toISOString().split("T")[0])
          .order("priority", { ascending: false })
          .order("due_date", { ascending: true }),
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, due_date, completed_at, objective_id, is_recurring, objectives(title)",
          )
          .eq("user_id", user!.id)
          .eq("is_recurring", false)
          .gte("completed_at", startOfDay.toISOString())
          .lte("completed_at", endOfDay.toISOString()),
        supabase
          .from("tasks")
          .select("id")
          .eq("user_id", user!.id)
          .eq("is_recurring", false)
          .neq("status", "completed")
          .lt("due_date", now.toISOString().split("T")[0])
          .not("due_date", "is", null),
        supabase
          .from("task_completions")
          .select("task_id")
          .eq("user_id", user!.id)
          .eq("completion_date", today),
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, due_date, completed_at, objective_id, is_recurring, objectives(title)",
          )
          .eq("user_id", user!.id)
          .eq("is_recurring", true),
      ]);

      setTasks((tasksResult.data || []) as unknown as Task[]);

      // Get recurring tasks that were completed today
      const completedRecurringTaskIds = new Set(
        (recurringCompletionsResult.data || []).map((tc) => tc.task_id),
      );
      setRecurringCompletedToday(completedRecurringTaskIds);
      const recurringCompleted = (
        (recurringTasksResult.data || []) as unknown as Task[]
      ).filter((task) => completedRecurringTaskIds.has(task.id));

      setRecurringTasks((recurringTasksResult.data || []) as unknown as Task[]);
      setCompletedToday([
        ...((completedResult.data || []) as unknown as Task[]),
        ...recurringCompleted,
      ]);

      setOverdueCount(overdueResult.data?.length || 0);
    } catch (error) {
      logger.error("Error loading daily data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "not_started" : "completed";
    const updates: Record<string, string | null> = { status: newStatus };

    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id);

    if (!error) {
      loadDailyData();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  const completionPercentage =
    tasks.length > 0
      ? Math.round(
          (tasks.filter((t) => t.status === "completed").length /
            tasks.length) *
            100,
        )
      : 0;

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
          {formatDate(selectedDate)}
        </h2>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {overdueCount} {t("tracking.overdue")}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider">
              {t("tracking.todaysProgress")}
            </h3>
            <div className="text-2xl font-heading font-bold text-blue-600 dark:text-blue-400">
              {completionPercentage}%
            </div>
          </div>
          <div className="w-full bg-blue-200/50 dark:bg-blue-900/50 rounded-full h-3 mb-2">
            <div
              className="h-3 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {tasks.filter((t) => t.status === "completed").length}{" "}
            {t("tracking.of")} {tasks.length} {t("tracking.tasksCompleted")}
          </p>
        </div>

        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 dark:bg-green-500 p-3 rounded-xl shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-green-900 dark:text-green-100">
                {completedToday.length}
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                {t("tracking.completedToday")}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 dark:bg-purple-500 p-3 rounded-xl shadow-lg shadow-purple-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-purple-900 dark:text-purple-100">
                {tasks.length}
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                {t("tracking.tasksDueToday")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-heading font-bold text-text-primary mb-4">
          {t("tracking.tasksDueToday")}
        </h3>
        {tasks.length === 0 ? (
          <div className="text-center py-12 glass-card border border-white/40 dark:border-white/10 border-dashed">
            <Calendar className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-30" />
            <p className="text-text-secondary font-medium">
              {t("tracking.noTasksDueToday")}
            </p>
            <p className="text-sm text-text-tertiary mt-1">
              {t("tracking.enjoyYourDay")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`glass-card p-4 border transition-all hover:shadow-md ${
                  task.status === "completed"
                    ? "bg-green-50/30 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/50"
                    : "border-white/40 dark:border-white/10 hover:border-accent-primary/20 dark:hover:border-accent-primary/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTaskStatus(task)}
                    className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-text-tertiary hover:text-green-600 dark:hover:text-green-500 transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-semibold text-base ${
                        task.status === "completed"
                          ? "text-text-tertiary line-through"
                          : "text-text-primary"
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getPriorityColor(
                          task.priority,
                        )}`}
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        {t(`tracking.${task.priority}`)}
                      </span>
                      {task.objectives && (
                        <span className="text-xs text-text-secondary bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded border border-white/50 dark:border-white/10">
                          {task.objectives.title}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-text-tertiary flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {recurringTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-heading font-bold text-text-primary mb-4">
            {t("tracking.recurringTasks")}
          </h3>
          <div className="space-y-3">
            {recurringTasks.map((task) => {
              const isCompleted = recurringCompletedToday.has(task.id);
              return (
                <div
                  key={task.id}
                  className={`glass-card p-4 border transition-all hover:shadow-md ${
                    isCompleted
                      ? "bg-green-50/30 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/50"
                      : "border-white/40 dark:border-white/10 hover:border-purple-200/50 dark:hover:border-purple-800/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={async () => {
                        const today = new Date().toISOString().split("T")[0];
                        if (isCompleted) {
                          const { data } = await supabase
                            .from("task_completions")
                            .select("id")
                            .eq("task_id", task.id)
                            .eq("completion_date", today)
                            .eq("user_id", user!.id)
                            .single();
                          if (data) {
                            await supabase
                              .from("task_completions")
                              .delete()
                              .eq("id", data.id);
                          }
                        } else {
                          await supabase.from("task_completions").insert({
                            task_id: task.id,
                            user_id: user!.id,
                            completion_date: today,
                          });
                        }
                        loadDailyData();
                      }}
                      className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-text-tertiary hover:text-green-600 dark:hover:text-green-500 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-semibold text-base ${
                            isCompleted
                              ? "text-text-tertiary line-through"
                              : "text-text-primary"
                          }`}
                        >
                          {task.title}
                        </h4>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          🔁 {t("tracking.recurring")}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getPriorityColor(
                            task.priority,
                          )}`}
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          {t(`tracking.${task.priority}`)}
                        </span>
                        {task.objectives && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">
                            <Link2 className="w-3 h-3" />
                            {task.objectives.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
