import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase } from '../../../lib/supabase';
import { Task, Objective } from '../types';
import { TaskCard } from '../cards';

interface TaskColumnProps {
  tasks: Task[];
  objectives: Objective[]; // All objectives (for dropdown in card edit)
  selectedObjectiveId: string | null;
  selectedTaskId: string | null;
  hasAnySelection: boolean; // True if any item at any level is selected
  isInSelectedFamily: (type: 'vision' | 'goal' | 'objective' | 'task', id: string) => boolean;
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;
  onSelectTask: (task: Task | null) => void;
  onCreateTask: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onToggleTaskStatus: (task: Task) => Promise<void>;
  onMarkRecurringCompletedToday: (taskId: string) => Promise<void>;
  onTitleClick: (type: 'vision' | 'goal' | 'objective' | 'task', title: string, description: string, e: React.MouseEvent) => void;
  onConvertToObjective?: (task: Task, targetGoalId: string | null) => Promise<void>;
  selectedObjective: Objective | null;
}

export function TaskColumn({
  tasks,
  objectives,
  selectedObjectiveId,
  selectedTaskId,
  hasAnySelection,
  isInSelectedFamily,
  editingTaskId,
  setEditingTaskId,
  onSelectTask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTaskStatus,
  onMarkRecurringCompletedToday,
  onTitleClick,
  onConvertToObjective,
  selectedObjective,
}: TaskColumnProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showOrphaned, setShowOrphaned] = useState(true);
  const [recurringCompletedToday, setRecurringCompletedToday] = useState<Record<string, boolean>>({});

  // Split tasks into objective-attached and orphaned
  // When filtering by family, we need to show all tasks (not pre-filtered by selectedObjectiveId)
  // because isInSelectedFamily will correctly identify family members
  const allObjectiveTasks = tasks.filter(t => t.objective_id !== null);
  const orphanedTasks = tasks.filter(t => t.objective_id === null);

  // Filter: if something is selected, only show family members; otherwise show all
  // When a vision/goal/objective/task is selected, show only tasks in that family
  const visibleObjectiveTasks = hasAnySelection
    ? allObjectiveTasks.filter(t => isInSelectedFamily('task', t.id))
    : allObjectiveTasks;
  const visibleOrphanedTasks = hasAnySelection
    ? orphanedTasks.filter(t => isInSelectedFamily('task', t.id))
    : orphanedTasks;

  // For display purposes, if an objective is selected, show only tasks attached to that objective
  // Otherwise, show all objective-attached tasks
  const displayObjectiveTasks = selectedObjectiveId
    ? visibleObjectiveTasks.filter(t => t.objective_id === selectedObjectiveId)
    : visibleObjectiveTasks;

  const totalCount = displayObjectiveTasks.length + (showOrphaned ? visibleOrphanedTasks.length : 0);

  const handleDelete = async (id: string) => {
    if (confirm(t('objectives.deleteTaskConfirm'))) {
      await onDeleteTask(id);
    }
  };

  // Check recurring task completions for today
  useEffect(() => {
    const checkRecurringCompletions = async () => {
      if (!user) return;

      const allTasks = [...allObjectiveTasks, ...orphanedTasks];
      const recurringTaskIds = allTasks
        .filter(t => t.is_recurring)
        .map(t => t.id);

      if (recurringTaskIds.length === 0) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('task_completions')
        .select('task_id')
        .in('task_id', recurringTaskIds)
        .eq('completion_date', today)
        .eq('user_id', user.id);

      const completedMap: Record<string, boolean> = {};
      recurringTaskIds.forEach(id => {
        completedMap[id] = (data || []).some(c => c.task_id === id);
      });
      setRecurringCompletedToday(completedMap);
    };

    checkRecurringCompletions();
  }, [tasks, user, allObjectiveTasks, orphanedTasks]);

  const renderTaskCard = (task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
      objectives={objectives}
      isSelected={selectedTaskId === task.id}
      isInFamily={isInSelectedFamily('task', task.id)}
      isEditing={editingTaskId === task.id}
      onSelect={() => onSelectTask(task)}
      onStartEdit={() => setEditingTaskId(task.id)}
      onCancelEdit={() => setEditingTaskId(null)}
      onSave={async (updates) => {
        await onUpdateTask(task.id, updates);
        setEditingTaskId(null);
      }}
      onDelete={() => handleDelete(task.id)}
      onTitleClick={(e) => onTitleClick('task', task.title, task.description || '', e)}
      onToggleStatus={() => onToggleTaskStatus(task)}
      onMarkRecurringCompletedToday={() => onMarkRecurringCompletedToday(task.id)}
      isRecurringCompletedToday={recurringCompletedToday[task.id] || false}
      onConvertToObjective={onConvertToObjective ? (targetGoalId) => onConvertToObjective(task, targetGoalId) : undefined}
    />
  );

  return (
    <div className="flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] flex flex-col glass-card border border-white/40 max-w-full w-full shrink">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">{t('objectives.tasks')}</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-purple-400">{t('objectives.bestUse')}</div>
              <p className="leading-relaxed">{t('objectives.taskBestUse')}</p>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onCreateTask}
          className="btn-primary w-full shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>{t('objectives.addTask')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="w-full space-y-6">
          {/* Orphaned tasks section - now at the top */}
          {visibleOrphanedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowOrphaned(!showOrphaned)}
                className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-3 px-1 hover:text-text-secondary transition-colors"
              >
                {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t('objectives.orphanedTasks')} ({visibleOrphanedTasks.length})
              </button>
              {showOrphaned && (
                <div className="space-y-3">
                  {visibleOrphanedTasks.map(renderTaskCard)}
                </div>
              )}
            </div>
          )}

          {/* Objective-attached tasks section */}
          {selectedObjective ? (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider px-1">
                {selectedObjective.title}
              </h3>
              <div className="space-y-3">
                {displayObjectiveTasks.length > 0 ? (
                  displayObjectiveTasks.map(renderTaskCard)
                ) : (
                  <div className="text-center text-text-tertiary py-8 bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-border-secondary">
                    {t('objectives.noTasksYet')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayObjectiveTasks.length > 0 ? (
                displayObjectiveTasks.map(renderTaskCard)
              ) : visibleOrphanedTasks.length === 0 ? (
                <div className="text-center text-text-tertiary py-8 bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-border-secondary">
                  {t('objectives.selectObjectiveToSeeTasks')}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

