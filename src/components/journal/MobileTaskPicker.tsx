import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Target,
  Flag,
  Sun,
  Cloud,
  Moon,
  Star,
  Check,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { BottomSheet } from "../ui";
import { TimeSlot } from "../../hooks/useDailyPlanner";
import { Task, Objective, Goal } from "../objectives/types";

interface MobileTaskPickerProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot: TimeSlot | null;
  availableTasks: (Task & {
    objective?: Objective | null;
    goal?: Goal | null;
  })[];
  isTaskPlanned: (taskId: string) => boolean;
  onAssignTask: (taskId: string, slot: TimeSlot) => Promise<boolean>;
}

const slotConfig: Record<
  TimeSlot,
  { icon: typeof Sun; label: string; color: string }
> = {
  morning: {
    icon: Sun,
    label: "Morning",
    color: "text-amber-600 dark:text-amber-400",
  },
  afternoon: {
    icon: Cloud,
    label: "Afternoon",
    color: "text-blue-600 dark:text-blue-400",
  },
  evening: {
    icon: Moon,
    label: "Evening",
    color: "text-purple-600 dark:text-purple-400",
  },
  night: {
    icon: Star,
    label: "Night",
    color: "text-indigo-600 dark:text-indigo-400",
  },
};

export function MobileTaskPicker({
  isOpen,
  onClose,
  targetSlot,
  availableTasks,
  isTaskPlanned,
  onAssignTask,
}: MobileTaskPickerProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "not_started" | "in_progress"
  >("all");
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [justAssigned, setJustAssigned] = useState<string | null>(null);

  // Filter to only show unplanned tasks
  const filteredTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      // Exclude already planned tasks
      if (isTaskPlanned(task.id)) return false;

      // Search filter
      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [availableTasks, isTaskPlanned, searchQuery, statusFilter]);

  // Group tasks by goal
  const tasksByGoal = useMemo(() => {
    return filteredTasks.reduce(
      (acc, task) => {
        const goalId = task.goal?.id || "orphaned";
        const goalTitle = task.goal?.title || t("planner.noGoal");
        if (!acc[goalId]) {
          acc[goalId] = { title: goalTitle, tasks: [] };
        }
        acc[goalId].tasks.push(task);
        return acc;
      },
      {} as Record<string, { title: string; tasks: typeof filteredTasks }>,
    );
  }, [filteredTasks, t]);

  const handleAssignTask = async (taskId: string) => {
    if (!targetSlot || assigningTaskId) return;

    setAssigningTaskId(taskId);

    try {
      const success = await onAssignTask(taskId, targetSlot);
      if (success) {
        // Show success feedback briefly
        setJustAssigned(taskId);
        setTimeout(() => {
          setJustAssigned(null);
        }, 500);
      }
    } finally {
      setAssigningTaskId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  if (!targetSlot) return null;

  const SlotIcon = slotConfig[targetSlot].icon;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <SlotIcon className={`w-5 h-5 ${slotConfig[targetSlot].color}`} />
          <span>
            {t("planner.addToSlot").replace(
              "{slot}",
              t(`planner.${targetSlot}`),
            )}
          </span>
        </div>
      }
      height="full"
    >
      <div className="flex flex-col h-full -mx-4 -mb-8">
        {/* Search & Filters - Sticky */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-4 pb-3 border-b border-gray-200 dark:border-gray-800 z-10">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("planner.searchTasks")}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === "all"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t("planner.all")}
            </button>
            <button
              onClick={() => setStatusFilter("not_started")}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === "not_started"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t("planner.notStarted")}
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === "in_progress"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t("planner.inProgress")}
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {Object.keys(tasksByGoal).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-sm">
                {searchQuery || statusFilter !== "all"
                  ? t("planner.noTasksMatch")
                  : t("planner.allTasksPlanned")}
              </p>
            </div>
          ) : (
            Object.entries(tasksByGoal).map(([goalId, { title, tasks }]) => (
              <div key={goalId}>
                {/* Goal header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Target className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                    {title}
                  </span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                    {tasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const isAssigning = assigningTaskId === task.id;
                    const wasJustAssigned = justAssigned === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          wasJustAssigned
                            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {task.title}
                          </h4>
                          {task.objective && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                              <Flag className="w-2.5 h-2.5" />
                              <span className="truncate">
                                {task.objective.title}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPriorityColor(task.priority || "medium")}`}
                            >
                              {task.priority}
                            </span>
                            {task.status === "in_progress" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {t("planner.inProgress")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Add button */}
                        <button
                          onClick={() => handleAssignTask(task.id)}
                          disabled={isAssigning || wasJustAssigned}
                          className={`p-2.5 rounded-xl transition-all ${
                            wasJustAssigned
                              ? "bg-green-500 text-white"
                              : isAssigning
                                ? "bg-gray-100 dark:bg-gray-700 text-gray-400"
                                : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 active:scale-95"
                          }`}
                        >
                          {wasJustAssigned ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Plus
                              className={`w-5 h-5 ${isAssigning ? "animate-pulse" : ""}`}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
