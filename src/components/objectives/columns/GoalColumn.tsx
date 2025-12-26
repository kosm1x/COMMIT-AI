import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Vision, Goal } from '../types';
import { GoalCard } from '../cards';

interface GoalColumnProps {
  // All goals (we'll filter/display appropriately)
  goals: Goal[];
  visions: Vision[];
  selectedVisionId: string | null;
  selectedGoalId: string | null;
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
  visions,
  selectedVisionId,
  selectedGoalId,
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
  const [showOrphaned, setShowOrphaned] = useState(true);

  // Split goals into vision-attached and orphaned
  const visionGoals = selectedVisionId
    ? goals.filter(g => g.vision_id === selectedVisionId)
    : goals.filter(g => g.vision_id !== null);

  const orphanedGoals = goals.filter(g => g.vision_id === null);

  const handleDelete = async (id: string) => {
    // Check for descendants
    const counts = await getGoalDescendantCounts(id);
    const hasDescendants = counts.objectives > 0 || counts.tasks > 0;

    if (!hasDescendants) {
      // No descendants, simple confirmation
      if (confirm('Delete this goal?')) {
        await onDeleteGoal(id);
      }
      return;
    }

    // Has descendants - show detailed confirmation
    const message = `This goal has:\n` +
      `• ${counts.objectives} objective${counts.objectives !== 1 ? 's' : ''}\n` +
      `• ${counts.tasks} task${counts.tasks !== 1 ? 's' : ''}\n\n` +
      `Choose an option:\n` +
      `OK = Delete everything (goal and all descendants)\n` +
      `Cancel = Orphan descendants (keep objectives/tasks but remove parent link)`;

    const deleteAll = confirm(message);
    await onDeleteGoal(id, !deleteAll); // If deleteAll is false, orphan descendants
  };

  const totalCount = visionGoals.length + (showOrphaned ? orphanedGoals.length : 0);

  return (
    <div className="flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] flex flex-col glass-card border border-white/40 max-w-full w-full shrink">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Goal / Project</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-blue-400">Best Use:</div>
              <p className="leading-relaxed">Major milestones or projects that move you toward your vision. Typically 1-3 years. Break down into objectives.</p>
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
          <span>Add Goal / Project</span>
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
              {visionGoals.length > 0 ? (
                visionGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    visions={visions}
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
                  />
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  No goals yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* No vision selected - show all non-orphan goals */}
        {!selectedVision && visionGoals.length > 0 && (
          <div className="space-y-2">
            {visionGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                visions={visions}
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
              />
            ))}
          </div>
        )}

        {/* Orphaned goals section - always available */}
        <div>
          <button
            onClick={() => setShowOrphaned(!showOrphaned)}
            className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1 hover:text-text-secondary transition-colors"
          >
            {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Orphaned Goals ({orphanedGoals.length})
          </button>
          {showOrphaned && (
            <div className="space-y-2">
              {orphanedGoals.length > 0 ? (
                orphanedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    visions={visions}
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
                  />
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4 bg-white/30 dark:bg-white/5 rounded-lg border border-dashed border-border-secondary">
                  No orphaned goals
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

