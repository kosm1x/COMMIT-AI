import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Objective, Goal, Task } from '../types';
import { ObjectiveCard } from '../cards';

interface ObjectiveColumnProps {
  objectives: Objective[];
  goals: Goal[]; // All goals (for dropdown in card edit)
  selectedGoalId: string | null;
  selectedObjectiveId: string | null;
  hasAnySelection: boolean; // True if any item at any level is selected
  isInSelectedFamily: (type: 'vision' | 'goal' | 'objective' | 'task', id: string) => boolean;
  editingObjectiveId: string | null;
  setEditingObjectiveId: (id: string | null) => void;
  onSelectObjective: (objective: Objective | null) => void;
  onCreateObjective: () => void;
  onUpdateObjective: (id: string, updates: Partial<Objective>) => Promise<boolean>;
  onDeleteObjective: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  getObjectiveDescendantCounts: (id: string) => Promise<{ tasks: number }>;
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
  onTitleClick,
  getObjectiveDescendantCounts,
  selectedGoal,
  taskCounts,
}: ObjectiveColumnProps) {
  const [showOrphaned, setShowOrphaned] = useState(true);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [objectiveTasks, setObjectiveTasks] = useState<Record<string, Task[]>>({});

  // Split objectives into goal-attached and orphaned
  // When filtering by family, we need to show all objectives (not pre-filtered by selectedGoalId)
  // because isInSelectedFamily will correctly identify family members
  const allGoalObjectives = objectives.filter(o => o.goal_id !== null);
  const orphanedObjectives = objectives.filter(o => o.goal_id === null);

  // Filter: if something is selected, only show family members; otherwise show all
  // When a vision/goal/objective/task is selected, show only objectives in that family
  const visibleGoalObjectives = hasAnySelection
    ? allGoalObjectives.filter(o => isInSelectedFamily('objective', o.id))
    : allGoalObjectives;
  const visibleOrphanedObjectives = hasAnySelection
    ? orphanedObjectives.filter(o => isInSelectedFamily('objective', o.id))
    : orphanedObjectives;

  // For display purposes, if a goal is selected, show only objectives attached to that goal
  // Otherwise, show all goal-attached objectives
  const displayGoalObjectives = selectedGoalId
    ? visibleGoalObjectives.filter(o => o.goal_id === selectedGoalId)
    : visibleGoalObjectives;

  const totalCount = displayGoalObjectives.length + (showOrphaned ? visibleOrphanedObjectives.length : 0);

  const handleDelete = async (id: string) => {
    // Check for descendants
    const counts = await getObjectiveDescendantCounts(id);
    const hasDescendants = counts.tasks > 0;

    if (!hasDescendants) {
      // No descendants, simple confirmation
      if (confirm('Delete this objective?')) {
        await onDeleteObjective(id);
      }
      return;
    }

    // Has descendants - show detailed confirmation
    const message = `This objective has ${counts.tasks} task${counts.tasks !== 1 ? 's' : ''}.\n\n` +
      `Choose an option:\n` +
      `OK = Delete everything (objective and all tasks)\n` +
      `Cancel = Orphan tasks (keep tasks but remove parent link)`;

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
          .from('tasks')
          .select('*')
          .eq('objective_id', objectiveId)
          .order('created_at', { ascending: false });

        if (data) {
          setObjectiveTasks(prev => ({
            ...prev,
            [objectiveId]: data
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

  const renderObjectiveCard = (objective: Objective) => (
    <ObjectiveCard
      key={objective.id}
      objective={objective}
      goals={goals}
      isSelected={selectedObjectiveId === objective.id}
      isInFamily={isInSelectedFamily('objective', objective.id)}
      isEditing={editingObjectiveId === objective.id}
      onSelect={() => onSelectObjective(objective)}
      onStartEdit={() => setEditingObjectiveId(objective.id)}
      onCancelEdit={() => setEditingObjectiveId(null)}
      onSave={async (updates) => {
        await onUpdateObjective(objective.id, updates);
        setEditingObjectiveId(null);
      }}
      onDelete={() => handleDelete(objective.id)}
      onTitleClick={(e) => onTitleClick('objective', objective.title, objective.description, e)}
      taskCount={taskCounts[objective.id]}
      isExpanded={expandedObjectives.has(objective.id)}
      onToggleExpand={() => toggleObjectiveExpanded(objective.id)}
      tasks={objectiveTasks[objective.id] || []}
    />
  );

  return (
    <div className="flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] flex flex-col glass-card border border-white/40 max-w-full w-full shrink">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Objectives</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-green-400">Best Use:</div>
              <p className="leading-relaxed">Specific, actionable steps to achieve a goal. Usually 3-6 months. Break into tasks. Objectives have clear success criteria and deadlines.</p>
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
          <span>Add Objective</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
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
                  No objectives yet
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayGoalObjectives.length > 0 ? (
              displayGoalObjectives.map(renderObjectiveCard)
            ) : (
              <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                No objectives yet
              </div>
            )}
          </div>
        )}

        {/* Orphaned objectives section */}
        <div>
          <button
            onClick={() => setShowOrphaned(!showOrphaned)}
            className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1 hover:text-text-secondary transition-colors"
          >
            {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Orphaned Objectives ({visibleOrphanedObjectives.length})
          </button>
          {showOrphaned && (
            <div className="space-y-2">
              {visibleOrphanedObjectives.length > 0 ? (
                visibleOrphanedObjectives.map(renderObjectiveCard)
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  No orphaned objectives
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

