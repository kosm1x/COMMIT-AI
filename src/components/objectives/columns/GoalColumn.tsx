import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Vision, Goal, Objective } from '../types';
import { GoalCard } from '../cards';

interface GoalColumnProps {
  // All goals (we'll filter/display appropriately)
  goals: Goal[];
  objectives: Objective[]; // All objectives (for displaying in goal cards)
  visions: Vision[];
  selectedVisionId: string | null;
  selectedGoalId: string | null;
  hasAnySelection: boolean; // True if any item at any level is selected
  isInSelectedFamily: (type: 'vision' | 'goal' | 'objective' | 'task', id: string) => boolean;
  editingGoalId: string | null;
  setEditingGoalId: (id: string | null) => void;
  onSelectGoal: (goal: Goal | null) => void;
  onCreateGoal: () => void;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => Promise<boolean>;
  onDeleteGoal: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  getGoalDescendantCounts: (id: string) => Promise<{ objectives: number; tasks: number }>;
  // Selected vision for context header
  selectedVision: Vision | null;
}

export function GoalColumn({
  goals,
  objectives,
  visions,
  selectedVisionId,
  selectedGoalId,
  hasAnySelection,
  isInSelectedFamily,
  editingGoalId,
  setEditingGoalId,
  onSelectGoal,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  onTitleClick,
  getGoalDescendantCounts,
  selectedVision,
}: GoalColumnProps) {
  const { t } = useLanguage();
  const [showOrphaned, setShowOrphaned] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [goalObjectives, setGoalObjectives] = useState<Record<string, Objective[]>>({});

  // Split goals into vision-attached and orphaned
  // When filtering by family, we need to show all goals (not pre-filtered by selectedVisionId)
  // because isInSelectedFamily will correctly identify family members
  const allVisionGoals = goals.filter(g => g.vision_id !== null);
  const orphanedGoals = goals.filter(g => g.vision_id === null);

  // Filter: if something is selected, only show family members; otherwise show all
  // When a vision is selected, show all goals in that vision's family
  // When a goal/objective/task is selected, show only goals in that family
  const visibleVisionGoals = hasAnySelection
    ? allVisionGoals.filter(g => isInSelectedFamily('goal', g.id))
    : allVisionGoals;
  const visibleOrphanedGoals = hasAnySelection
    ? orphanedGoals.filter(g => isInSelectedFamily('goal', g.id))
    : orphanedGoals;

  // For display purposes, if a vision is selected, show only goals attached to that vision
  // Otherwise, show all vision-attached goals
  const displayVisionGoals = selectedVisionId
    ? visibleVisionGoals.filter(g => g.vision_id === selectedVisionId)
    : visibleVisionGoals;

  const handleDelete = async (id: string) => {
    // Check for descendants
    const counts = await getGoalDescendantCounts(id);
    const hasDescendants = counts.objectives > 0 || counts.tasks > 0;

    if (!hasDescendants) {
      // No descendants, simple confirmation
      if (confirm(t('objectives.deleteGoalConfirm'))) {
        await onDeleteGoal(id);
      }
      return;
    }

    // Has descendants - show detailed confirmation
    const message = t('objectives.deleteWithDescendantsMessage')
      .replace('{{type}}', t('objectives.goal'))
      .replace('{{goals}}', '0')
      .replace('{{goalsPlural}}', '')
      .replace('{{objectives}}', counts.objectives.toString())
      .replace('{{objectivesPlural}}', counts.objectives !== 1 ? 's' : '')
      .replace('{{tasks}}', counts.tasks.toString())
      .replace('{{tasksPlural}}', counts.tasks !== 1 ? 's' : '');

    const deleteAll = confirm(message);
    await onDeleteGoal(id, !deleteAll); // If deleteAll is false, orphan descendants
  };

  // Calculate objective counts for each goal
  const objectiveCounts: Record<string, { total: number; completed: number }> = {};
  goals.forEach(goal => {
    const goalObjs = objectives.filter(obj => obj.goal_id === goal.id);
    objectiveCounts[goal.id] = {
      total: goalObjs.length,
      completed: goalObjs.filter(obj => obj.status === 'completed').length,
    };
  });

  const toggleGoalExpanded = async (goalId: string) => {
    const newExpanded = new Set(expandedGoals);

    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
      // Load objectives for this goal if not already loaded
      if (!goalObjectives[goalId]) {
        const goalObjs = objectives.filter(obj => obj.goal_id === goalId);
        setGoalObjectives(prev => ({
          ...prev,
          [goalId]: goalObjs
        }));
      }
    }

    setExpandedGoals(newExpanded);
  };

  // Clear expanded state when selected vision changes
  useEffect(() => {
    setExpandedGoals(new Set());
    setGoalObjectives({});
  }, [selectedVisionId]);

  const totalCount = displayVisionGoals.length + (showOrphaned ? visibleOrphanedGoals.length : 0);

  const renderGoalCard = (goal: Goal) => (
    <GoalCard
      key={goal.id}
      goal={goal}
      visions={visions}
      objectives={objectives}
      isSelected={selectedGoalId === goal.id}
      isInFamily={isInSelectedFamily('goal', goal.id)}
      isEditing={editingGoalId === goal.id}
      onSelect={() => onSelectGoal(goal)}
      onStartEdit={() => setEditingGoalId(goal.id)}
      onCancelEdit={() => setEditingGoalId(null)}
      onSave={async (updates) => {
        await onUpdateGoal(goal.id, updates);
        setEditingGoalId(null);
      }}
      onDelete={() => handleDelete(goal.id)}
      onTitleClick={(e) => onTitleClick('goal', goal.title, goal.description, e)}
      objectiveCount={objectiveCounts[goal.id]}
      isExpanded={expandedGoals.has(goal.id)}
      onToggleExpand={() => toggleGoalExpanded(goal.id)}
      goalObjectives={goalObjectives[goal.id] || []}
    />
  );

  return (
    <div className="flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] flex flex-col glass-card border border-white/40 max-w-full w-full shrink">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">{t('objectives.goal')}</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-blue-400">{t('objectives.bestUse')}</div>
              <p className="leading-relaxed">{t('objectives.goalBestUse')}</p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onCreateGoal}
          className="btn-primary w-full shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>{t('objectives.addGoal')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Vision-attached goals section */}
        {selectedVision && (
          <div>
            <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
              {selectedVision.title}
            </h3>
            <div className="space-y-2">
              {displayVisionGoals.length > 0 ? (
                displayVisionGoals.map(renderGoalCard)
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  {t('objectives.noGoalsYet')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* No vision selected - show all non-orphan goals */}
        {!selectedVision && displayVisionGoals.length > 0 && (
          <div className="space-y-2">
            {displayVisionGoals.map(renderGoalCard)}
          </div>
        )}

        {/* Orphaned goals section - always available */}
        <div>
          <button
            onClick={() => setShowOrphaned(!showOrphaned)}
            className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1 hover:text-text-secondary transition-colors"
          >
            {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {t('objectives.orphanedGoals')} ({visibleOrphanedGoals.length})
          </button>
          {showOrphaned && (
            <div className="space-y-2">
              {visibleOrphanedGoals.length > 0 ? (
                visibleOrphanedGoals.map(renderGoalCard)
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  {t('objectives.noOrphanedGoals')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

