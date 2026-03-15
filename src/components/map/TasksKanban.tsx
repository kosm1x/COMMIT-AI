import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { Calendar, Flag, Link2, CheckCircle2 } from "lucide-react";
import { createIsInSelectedFamily } from "../../utils/familyTree";
import { sortTasks } from "../../utils/autoSort";

interface Task {
  id: string;
  objective_id: string | null;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  priority: "high" | "medium" | "low";
  due_date: string | null;
  is_recurring: boolean;
  order: number;
}

interface Objective {
  id: string;
  title: string;
  goal_id: string | null;
}

interface Goal {
  id: string;
  vision_id: string | null;
}

interface TasksKanbanProps {
  selectedVisionId: string | null;
  selectedGoalId: string | null;
  selectedObjectiveId: string | null;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  highlightedItemId?: string | null;
}

const getStatusColumns = (t: (key: string) => string) =>
  [
    {
      id: "not_started",
      label: t("map.notStarted"),
      color: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    },
    {
      id: "in_progress",
      label: t("map.inProgress"),
      color: "bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100",
    },
    {
      id: "on_hold",
      label: t("map.onHold"),
      color:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100",
    },
    {
      id: "completed",
      label: t("map.completed"),
      color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100",
    },
  ] as const;

export default function TasksKanban({
  selectedVisionId,
  selectedGoalId,
  selectedObjectiveId,
  selectedTaskId,
  onSelectTask,
  highlightedItemId,
}: TasksKanbanProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const STATUS_COLUMNS = getStatusColumns(t);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const [draggedOverStatus, setDraggedOverStatus] = useState<string | null>(
    null,
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Scroll to highlighted card when it changes
  useEffect(() => {
    if (highlightedItemId && cardRefs.current[highlightedItemId]) {
      setTimeout(() => {
        cardRefs.current[highlightedItemId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 200);
    }
  }, [highlightedItemId, tasks]);

  const hasAppliedSort = useRef(false);

  const loadData = async () => {
    setLoading(true);
    const [tasksResult, objectivesResult, goalsResult] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          'id, objective_id, title, description, status, priority, due_date, completed_at, is_recurring, notes, document_links, "order", last_edited_at',
        )
        .eq("user_id", user!.id)
        .order("order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("objectives")
        .select("id, title, goal_id")
        .eq("user_id", user!.id),
      supabase.from("goals").select("id, vision_id").eq("user_id", user!.id),
    ]);

    if (tasksResult.data) {
      let loadedTasks = tasksResult.data;
      if (!hasAppliedSort.current) {
        hasAppliedSort.current = true;
        loadedTasks = sortTasks(loadedTasks as any) as any;
      }
      setTasks(loadedTasks as Task[]);
    }
    if (objectivesResult.data) {
      setObjectives(objectivesResult.data as Objective[]);
    }
    if (goalsResult.data) {
      setGoals(goalsResult.data);
    }
    setLoading(false);
  };

  // Check if there's any selection
  const hasSelection =
    selectedVisionId || selectedGoalId || selectedObjectiveId || selectedTaskId;

  // Create family filter function
  const isInSelectedFamily = createIsInSelectedFamily(
    {
      visionId: selectedVisionId,
      goalId: selectedGoalId,
      objectiveId: selectedObjectiveId,
      taskId: selectedTaskId,
    },
    goals,
    objectives,
    tasks,
  );

  const handleDragStart = (taskId: string, status: string) => {
    setDraggedItem(taskId);
    setDraggedOverStatus(status);
  };

  const handleDragOver = (
    e: React.DragEvent,
    taskId: string,
    status: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem !== taskId) {
      setDraggedOverItem(taskId);
      setDraggedOverStatus(status);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverItem(null);
  };

  const handleDrop = async (
    targetTaskId: string | null,
    targetStatus: string,
  ) => {
    if (!draggedItem || !draggedOverStatus) return;

    const draggedTask = tasks.find((t) => t.id === draggedItem);
    if (!draggedTask) return;

    const sameStatus = draggedTask.status === targetStatus;

    if (sameStatus && targetTaskId) {
      // Vertical reordering within the same column
      const statusTasks = tasks
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.order - b.order);
      const targetIndex = statusTasks.findIndex((t) => t.id === targetTaskId);
      const draggedIndex = statusTasks.findIndex((t) => t.id === draggedItem);

      if (targetIndex === -1 || draggedIndex === -1) return;

      // Calculate new order values
      const newTasks = [...statusTasks];
      newTasks.splice(draggedIndex, 1);
      newTasks.splice(targetIndex, 0, draggedTask);

      // Update orders
      const updates = newTasks.map((task, index) => ({
        id: task.id,
        order: index,
      }));

      // Batch update orders
      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({ order: update.order })
          .eq("id", update.id);
      }
    } else {
      // Status change (horizontal movement)
      // For recurring tasks, don't change status when dragging to completed
      if (draggedTask.is_recurring && targetStatus === "completed") {
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("task_completions")
          .select("id")
          .eq("task_id", draggedItem)
          .eq("completion_date", today)
          .eq("user_id", user!.id)
          .single();

        if (!existing) {
          await supabase.from("task_completions").insert({
            task_id: draggedItem,
            user_id: user!.id,
            completion_date: today,
          });
        }
      } else {
        const statusTasks = tasks
          .filter((t) => t.status === targetStatus)
          .sort((a, b) => a.order - b.order);
        const newOrder =
          statusTasks.length > 0
            ? Math.max(...statusTasks.map((t) => t.order)) + 1
            : 0;

        const updates: any = { status: targetStatus, order: newOrder };
        if (targetStatus === "completed") {
          updates.completed_at = new Date().toISOString();
        } else {
          updates.completed_at = null;
        }

        await supabase.from("tasks").update(updates).eq("id", draggedItem);
      }
    }

    setDraggedItem(null);
    setDraggedOverItem(null);
    setDraggedOverStatus(null);
    loadData();
  };

  const getTasksByStatus = (status: string) => {
    let filteredTasks = tasks.filter((task) => task.status === status);

    // If there's a selection, only show family members
    if (hasSelection) {
      filteredTasks = filteredTasks.filter((task) =>
        isInSelectedFamily("task", task.id),
      );
    }

    return filteredTasks;
  };

  const getObjectiveTitle = (objectiveId: string | null) => {
    if (!objectiveId) return null;
    const objective = objectives.find((o) => o.id === objectiveId);
    return objective?.title;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map((column) => (
        <div
          key={column.id}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!draggedOverItem) {
              handleDrop(null, column.id);
            }
          }}
          className="flex flex-col"
        >
          <div
            className={`${column.color} px-4 py-2 rounded-t-lg border-x border-t border-white/20 dark:border-white/10`}
          >
            <h3 className="font-semibold">{column.label}</h3>
            <p className="text-sm opacity-80">
              {getTasksByStatus(column.id).length} {t("map.tasks")}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-b-lg min-h-[200px] space-y-3 border border-white/20 dark:border-white/10">
            {getTasksByStatus(column.id)
              .sort((a, b) => a.order - b.order)
              .map((task) => {
                const isSelected = selectedTaskId === task.id;
                const isDragged = draggedItem === task.id;
                const isDraggedOver =
                  draggedOverItem === task.id &&
                  draggedOverStatus === column.id;

                const isHighlighted = highlightedItemId === task.id;

                return (
                  <div
                    key={task.id}
                    ref={(el) => {
                      cardRefs.current[task.id] = el;
                    }}
                    draggable
                    onDragStart={() => handleDragStart(task.id, column.id)}
                    onDragOver={(e) => handleDragOver(e, task.id, column.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(task.id, column.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(isSelected ? null : task.id);
                    }}
                    className={`bg-white dark:bg-white/10 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 cursor-pointer hover:shadow-md transition-all ${
                      isDragged ? "opacity-50" : ""
                    } ${isDraggedOver ? "border-t-4 border-t-teal-500" : ""} ${
                      isHighlighted
                        ? "ring-4 ring-purple-400 ring-offset-2 dark:ring-offset-gray-900 animate-pulse shadow-lg shadow-purple-500/30"
                        : ""
                    } ${isSelected ? "ring-2 ring-teal-500 border-teal-500" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        {task.status === "completed" && (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer ${
                              task.status === "completed"
                                ? "line-through text-gray-500 dark:text-gray-400"
                                : ""
                            } ${isSelected ? "ring-2 ring-teal-500 rounded px-1" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/objectives", {
                                state: {
                                  selectTask: task.id,
                                  timestamp: Date.now(), // Ensure each navigation is unique
                                },
                              });
                            }}
                          >
                            {task.title}
                          </h4>
                          {task.is_recurring && (
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                              🔁
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(
                          task.priority,
                        )}`}
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        {t(`objectives.${task.priority}`)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {!task.is_recurring && task.due_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {task.objective_id ? (
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {getObjectiveTitle(task.objective_id)}
                        </div>
                      ) : (
                        <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {t("map.orphaned")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            {getTasksByStatus(column.id).length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                {t("map.noTasksInStatus")}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
