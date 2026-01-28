import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Vision, Goal, Objective } from '../types';
import { GoalCard } from '../cards';
import { sortGoals } from '../../../utils/autoSort';

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
  onToggleGoalStatus: (goal: Goal) => Promise<void>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  getGoalDescendantCounts: (id: string) => Promise<{ objectives: number; tasks: number }>;
  onConvertToVision?: (goal: Goal) => Promise<void>;
  onConvertToObjective?: (goal: Goal, targetGoalId: string | null) => Promise<void>;
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
  onToggleGoalStatus,
  onTitleClick,
  getGoalDescendantCounts,
  onConvertToVision,
  onConvertToObjective,
  selectedVision,
}: GoalColumnProps) {
  const { t } = useLanguage();
  const [showOrphaned, setShowOrphaned] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [goalObjectives, setGoalObjectives] = useState<Record<string, Objective[]>>({});
  const editingCardRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);

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

  // Memoized sorting function that moves editing goal to top
  const sortedOrphanedGoals = useMemo(() => {
    // First sort by standard sorting (status, target_date, title)
    const sorted = sortGoals(visibleOrphanedGoals);
    
    // Then move editing goal to top if it exists
    if (!editingGoalId) return sorted;
    
    const editingGoal = sorted.find(g => g.id === editingGoalId);
    if (!editingGoal) return sorted;
    
    return [editingGoal, ...sorted.filter(g => g.id !== editingGoalId)];
  }, [visibleOrphanedGoals, editingGoalId]);

  const sortedVisionGoals = useMemo(() => {
    // First sort by standard sorting (status, target_date, title)
    const sorted = sortGoals(displayVisionGoals);
    
    // Then move editing goal to top if it exists
    if (!editingGoalId) return sorted;
    
    const editingGoal = sorted.find(g => g.id === editingGoalId);
    if (!editingGoal) return sorted;
    
    return [editingGoal, ...sorted.filter(g => g.id !== editingGoalId)];
  }, [displayVisionGoals, editingGoalId]);

  // Keep editing card centered in view - robust scroll mechanism with multiple retries
  useEffect(() => {
    if (!editingGoalId) return;
    
    let isCancelled = false;
    const timeoutIds: NodeJS.Timeout[] = [];
    
    // Function to scroll the editing card into center view
    const scrollToEditingCard = () => {
      if (isCancelled) return;
      if (editingCardRef.current) {
        // Use requestAnimationFrame to ensure we're in a stable render cycle
        requestAnimationFrame(() => {
          if (isCancelled || !editingCardRef.current) return;
          editingCardRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        });
      }
    };
    
    // Multiple scroll attempts with increasing delays to handle:
    // 1. Initial render (100ms)
    // 2. Data loading and re-renders (300ms)
    // 3. Layout shifts from async operations (600ms)
    // 4. Final stabilization (1000ms)
    const delays = [100, 300, 600, 1000];
    delays.forEach(delay => {
      timeoutIds.push(setTimeout(scrollToEditingCard, delay));
    });
    
    return () => {
      isCancelled = true;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [editingGoalId]);

  const totalCount = displayVisionGoals.length + (showOrphaned ? visibleOrphanedGoals.length : 0);

  const renderGoalCard = (goal: Goal) => {
    const isEditing = editingGoalId === goal.id;
    return (
      <div key={goal.id} ref={isEditing ? editingCardRef : null}>
        <GoalCard
          goal={goal}
          visions={visions}
          objectives={objectives}
          isSelected={selectedGoalId === goal.id}
          isInFamily={isInSelectedFamily('goal', goal.id)}
          isEditing={isEditing}
          onSelect={() => onSelectGoal(goal)}
          onStartEdit={() => setEditingGoalId(goal.id)}
          onCancelEdit={() => setEditingGoalId(null)}
          onSave={async (updates) => {
            await onUpdateGoal(goal.id, updates);
            setEditingGoalId(null);
          }}
          onDelete={() => handleDelete(goal.id)}
          onToggleStatus={() => onToggleGoalStatus(goal)}
          onTitleClick={(e) => onTitleClick('goal', goal.title, goal.description, e)}
          onConvertToVision={onConvertToVision ? () => onConvertToVision(goal) : undefined}
          onConvertToObjective={onConvertToObjective ? (targetGoalId) => onConvertToObjective(goal, targetGoalId) : undefined}
          objectiveCount={objectiveCounts[goal.id]}
          isExpanded={expandedGoals.has(goal.id)}
          onToggleExpand={() => toggleGoalExpanded(goal.id)}
          goalObjectives={goalObjectives[goal.id] || []}
        />
      </div>
    );
  };

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

      <div ref={columnRef} className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Orphaned goals section - now at the top */}
        {visibleOrphanedGoals.length > 0 && (
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
                {sortedOrphanedGoals.map(renderGoalCard)}
              </div>
            )}
          </div>
        )}

        {/* Vision-attached goals section */}
        {selectedVision && (
          <div>
            <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
              {selectedVision.title}
            </h3>
            <div className="space-y-2">
              {displayVisionGoals.length > 0 ? (
                sortedVisionGoals.map(renderGoalCard)
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
            {sortedVisionGoals.map(renderGoalCard)}
          </div>
        )}
      </div>
    </div>
  );
}

