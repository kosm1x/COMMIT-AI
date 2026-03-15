import { useState } from "react";
import {
  Sun,
  Cloud,
  Moon,
  Star,
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { TimeSlot, PlannedTask } from "../../hooks/useDailyPlanner";

interface MobileTimeSlotSectionProps {
  slot: TimeSlot;
  tasks: PlannedTask[];
  onAddTask: (slot: TimeSlot) => void;
  onRemoveTask: (plannedTaskId: string) => void;
  onToggleCompletion: (taskId: string) => void;
  defaultExpanded?: boolean;
}

const slotConfig: Record<
  TimeSlot,
  {
    icon: typeof Sun;
    color: string;
    bgColor: string;
    borderColor: string;
    timeRange: string;
  }
> = {
  morning: {
    icon: Sun,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    timeRange: "5am - 12pm",
  },
  afternoon: {
    icon: Cloud,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    timeRange: "12pm - 5pm",
  },
  evening: {
    icon: Moon,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    timeRange: "5pm - 9pm",
  },
  night: {
    icon: Star,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    timeRange: "9pm - 5am",
  },
};

export function MobileTimeSlotSection({
  slot,
  tasks,
  onAddTask,
  onRemoveTask,
  onToggleCompletion,
  defaultExpanded = false,
}: MobileTimeSlotSectionProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = slotConfig[slot];
  const Icon = config.icon;

  const completedCount = tasks.filter(
    (t) => t.task.status === "completed",
  ).length;

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className={`rounded-xl border ${config.borderColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full ${config.bgColor} px-4 py-3 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <div className="text-left">
            <h3 className={`font-semibold ${config.color}`}>
              {t(`planner.${slot}`)}
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {config.timeRange}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Task count */}
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {completedCount}/{tasks.length}
          </span>

          {/* Add button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTask(slot);
            }}
            className={`p-1.5 rounded-lg ${config.color} hover:bg-white/50 dark:hover:bg-black/20 transition-colors`}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Expand/Collapse chevron */}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Tasks list */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-900 p-3 space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-4">
              <Icon
                className={`w-6 h-6 ${config.color} opacity-30 mx-auto mb-1`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t("planner.noTasksScheduled")}
              </p>
              <button
                onClick={() => onAddTask(slot)}
                className={`mt-2 text-xs ${config.color} font-medium`}
              >
                + {t("planner.addTask")}
              </button>
            </div>
          ) : (
            tasks.map((plannedTask) => {
              const { task } = plannedTask;
              const isCompleted = task.status === "completed";

              return (
                <div
                  key={plannedTask.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 ${
                    isCompleted
                      ? "opacity-60 bg-gray-50 dark:bg-gray-800/50"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  {/* Priority indicator */}
                  <div
                    className={`w-1 h-8 rounded-full ${getPriorityIndicator(task.priority || "medium")}`}
                  />

                  {/* Completion toggle - larger touch target */}
                  <button
                    onClick={() => onToggleCompletion(plannedTask.task_id)}
                    className="p-1 -m-1 flex-shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </button>

                  {/* Task title */}
                  <span
                    className={`flex-1 text-sm font-medium truncate ${
                      isCompleted
                        ? "text-gray-400 dark:text-gray-500 line-through"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {task.title}
                  </span>

                  {/* Remove button - always visible on mobile */}
                  <button
                    onClick={() => onRemoveTask(plannedTask.id)}
                    className="p-2 -m-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
