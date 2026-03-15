import {
  CheckCircle2,
  Circle,
  X,
  GripVertical,
  Target,
  Flag,
} from "lucide-react";
import { PlannedTask } from "../../hooks/useDailyPlanner";

interface PlannedTaskCardProps {
  plannedTask: PlannedTask;
  onRemove: () => void;
  onToggleCompletion: () => void;
  onDragStart: (e: React.DragEvent) => void;
  index: number;
}

export function PlannedTaskCard({
  plannedTask,
  onRemove,
  onToggleCompletion,
  onDragStart,
  // index is available for future reordering functionality
}: PlannedTaskCardProps) {
  const { task } = plannedTask;
  const isCompleted = task.status === "completed";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-green-500";
      default:
        return "border-l-gray-300";
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${getPriorityColor(task.priority || "medium")} transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start p-3 gap-2">
        {/* Drag handle */}
        <div className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Completion toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompletion();
          }}
          className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-medium leading-snug ${
              isCompleted
                ? "text-gray-400 dark:text-gray-500 line-through"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {task.title}
          </h4>

          {/* Hierarchy context */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            {task.goal && (
              <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                <Target className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">{task.goal.title}</span>
              </div>
            )}
            {task.objective && (
              <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                <Flag className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">
                  {task.objective.title}
                </span>
              </div>
            )}
          </div>

          {/* Priority badge */}
          <div className="mt-1.5">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                task.priority === "high"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : task.priority === "medium"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {task.priority}
            </span>
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
