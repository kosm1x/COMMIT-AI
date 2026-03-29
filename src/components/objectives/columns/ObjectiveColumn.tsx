import { useState, useEffect, useRef } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { Objective, Goal, Task } from "../types";
import { ObjectiveCard } from "../cards";

interface ObjectiveColumnProps {
  objectives: Objective[];
  goals: Goal[]; // All goals (for dropdown in card edit)
  selectedGoalId: string | null;
  selectedObjectiveId: string | null;
  hasAnySelection: boolean; // True if any item at any level is selected
  isInSelectedFamily: (
    type: "vision" | "goal" | "objective" | "task",
    id: string,
  ) => boolean;
  editingObjectiveId: string | null;
  setEditingObjectiveId: (id: string | null) => void;
  onSelectObjective: (objective: Objective | null) => void;
  onCreateObjective: () => void;
  onUpdateObjective: (
    id: string,
    updates: Partial<Objective>,
  ) => Promise<boolean>;
  onDeleteObjective: (
    id: string,
    orphanDescendants?: boolean,
  ) => Promise<boolean>;
  onToggleObjectiveStatus: (objective: Objective) => Promise<void>;
  onTitleClick: (
    type: "vision" | "goal" | "objective" | "task",
    title: string,
    description: string,
    e: React.MouseEvent,
  ) => void;
  getObjectiveDescendantCounts: (id: string) => Promise<{ tasks: number }>;
  onConvertToGoal?: (
    objective: Objective,
    targetVisionId: string | null,
  ) => Promise<void>;
  onConvertToTask?: (
    objective: Objective,
    targetObjectiveId: string | null,
  ) => Promise<void>;
  onCreateTaskForObjective?: (
    objectiveId: string,
    title: string,
    description: string,
    priority: string,
  ) => Promise<void>;
  selectedGoal: Goal | null;
  taskCounts: Record<string, { total: number; completed: number }>;
}

export function ObjectiveColumn({
  objectives,
  goals,
  selectedGoalId,
  selectedObjectiveId,
  hasAnySelection,
  isInSelectedFamily,
  editingObjectiveId,
  setEditingObjectiveId,
  onSelectObjective,
  onCreateObjective,
  onUpdateObjective,
  onDeleteObjective,
  onToggleObjectiveStatus,
  onTitleClick,
  getObjectiveDescendantCounts,
  onConvertToGoal,
  onConvertToTask,
  onCreateTaskForObjective,
  selectedGoal,
  taskCounts,
}: ObjectiveColumnProps) {
  const { t } = useLanguage();
  const [showOrphaned, setShowOrphaned] = useState(true);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    new Set(),
  );
  const [objectiveTasks, setObjectiveTasks] = useState<Record<string, Task[]>>(
    {},
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Split objectives into goal-attached and orphaned
  // When filtering by family, we need to show all objectives (not pre-filtered by selectedGoalId)
  // because isInSelectedFamily will correctly identify family members
  const allGoalObjectives = objectives.filter((o) => o.goal_id !== null);
  const orphanedObjectives = objectives.filter((o) => o.goal_id === null);

  // Filter: if something is selected, only show family members; otherwise show all
  const displayGoalObjectives = hasAnySelection
    ? allGoalObjectives.filter((o) => isInSelectedFamily("objective", o.id))
    : allGoalObjectives;
  const visibleOrphanedObjectives = hasAnySelection
    ? orphanedObjectives.filter((o) => isInSelectedFamily("objective", o.id))
    : orphanedObjectives;

  const totalCount =
    displayGoalObjectives.length +
    (showOrphaned ? visibleOrphanedObjectives.length : 0);

  const handleDelete = async (id: string) => {
    // Check for descendants
    const counts = await getObjectiveDescendantCounts(id);
    const hasDescendants = counts.tasks > 0;

    if (!hasDescendants) {
      // No descendants, simple confirmation
      if (confirm(t("objectives.deleteObjectiveConfirm"))) {
        await onDeleteObjective(id);
      }
      return;
    }

    // Has descendants - show detailed confirmation
    const message = t("objectives.deleteWithDescendantsMessage")
      .replace("{{type}}", t("objectives.objective"))
      .replace("{{goals}}", "0")
      .replace("{{goalsPlural}}", "")
      .replace("{{objectives}}", "0")
      .replace("{{objectivesPlural}}", "")
      .replace("{{tasks}}", counts.tasks.toString())
      .replace("{{tasksPlural}}", counts.tasks !== 1 ? "s" : "");

    const deleteAll = confirm(message);
    await onDeleteObjective(id, !deleteAll); // If deleteAll is false, orphan descendants
  };

  const toggleObjectiveExpanded = async (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);

    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
      // Load tasks for this objective if not already loaded
      if (!objectiveTasks[objectiveId]) {
        const { data } = await supabase
          .from("tasks")
          .select("*")
          .eq("objective_id", objectiveId)
          .order("created_at", { ascending: false });

        if (data) {
          setObjectiveTasks((prev) => ({
            ...prev,
            [objectiveId]: data as Task[],
          }));
        }
      }
    }

    setExpandedObjectives(newExpanded);
  };

  // Clear expanded state when selected goal changes
  useEffect(() => {
    setExpandedObjectives(new Set());
    setObjectiveTasks({});
  }, [selectedGoalId]);

  // Scroll to editing card when editingObjectiveId changes - robust scroll mechanism
  useEffect(() => {
    if (!editingObjectiveId) return;

    let isCancelled = false;
    const timeoutIds: NodeJS.Timeout[] = [];

    const scrollToEditingCard = () => {
      if (isCancelled) return;
      const cardElement = cardRefs.current[editingObjectiveId];
      if (cardElement) {
        requestAnimationFrame(() => {
          if (isCancelled) return;
          cardRefs.current[editingObjectiveId]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        });
      }
    };

    // Multiple scroll attempts with increasing delays
    const delays = [100, 300, 600, 1000];
    delays.forEach((delay) => {
      timeoutIds.push(setTimeout(scrollToEditingCard, delay));
    });

    return () => {
      isCancelled = true;
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [editingObjectiveId]);

  const renderObjectiveCard = (objective: Objective) => (
    <div
      key={objective.id}
      ref={(el) => {
        cardRefs.current[objective.id] = el;
      }}
    >
      <ObjectiveCard
        objective={objective}
        goals={goals}
        isSelected={selectedObjectiveId === objective.id}
        isInFamily={isInSelectedFamily("objective", objective.id)}
        isEditing={editingObjectiveId === objective.id}
        onSelect={() => onSelectObjective(objective)}
        onStartEdit={() => setEditingObjectiveId(objective.id)}
        onCancelEdit={() => setEditingObjectiveId(null)}
        onSave={async (updates) => {
          await onUpdateObjective(objective.id, updates);
          setEditingObjectiveId(null);
        }}
        onDelete={() => handleDelete(objective.id)}
        onToggleStatus={() => onToggleObjectiveStatus(objective)}
        onTitleClick={(e) =>
          onTitleClick(
            "objective",
            objective.title,
            objective.description || "",
            e,
          )
        }
        onConvertToGoal={
          onConvertToGoal
            ? (targetVisionId) => onConvertToGoal(objective, targetVisionId)
            : undefined
        }
        onConvertToTask={
          onConvertToTask
            ? (targetObjectiveId) =>
                onConvertToTask(objective, targetObjectiveId)
            : undefined
        }
        taskCount={taskCounts[objective.id]}
        isExpanded={expandedObjectives.has(objective.id)}
        onToggleExpand={() => toggleObjectiveExpanded(objective.id)}
        tasks={objectiveTasks[objective.id] || []}
        onCreateTask={
          onCreateTaskForObjective
            ? (title, description, priority) =>
                onCreateTaskForObjective(
                  objective.id,
                  title,
                  description,
                  priority,
                )
            : undefined
        }
      />
    </div>
  );

  return (
    <div className="flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] flex flex-col glass-card border border-white/40 max-w-full w-full shrink">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">
              {t("objectives.objective")}
            </h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-green-400">
                {t("objectives.bestUse")}
              </div>
              <p className="leading-relaxed">
                {t("objectives.objectiveBestUse")}
              </p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onCreateObjective}
          className="btn-primary w-full shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>{t("objectives.addObjective")}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Orphaned objectives section - now at the top */}
        {visibleOrphanedObjectives.length > 0 && (
          <div>
            <button
              onClick={() => setShowOrphaned(!showOrphaned)}
              className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1 hover:text-text-secondary transition-colors"
            >
              {showOrphaned ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {t("objectives.orphanedObjectives")} (
              {visibleOrphanedObjectives.length})
            </button>
            {showOrphaned && (
              <div className="space-y-2">
                {visibleOrphanedObjectives.map(renderObjectiveCard)}
              </div>
            )}
          </div>
        )}

        {/* Goal-attached objectives section */}
        {selectedGoal ? (
          <div>
            <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
              {selectedGoal.title}
            </h3>
            <div className="space-y-2">
              {displayGoalObjectives.length > 0 ? (
                displayGoalObjectives.map(renderObjectiveCard)
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  {t("objectives.noObjectivesYet")}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayGoalObjectives.length > 0 ? (
              displayGoalObjectives.map(renderObjectiveCard)
            ) : visibleOrphanedObjectives.length === 0 ? (
              <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                No objectives yet
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
