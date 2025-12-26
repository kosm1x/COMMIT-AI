import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Task, Objective } from '../types';
import { TaskCard } from '../cards';
import { useAuth } from '../../../contexts/AuthContext';

interface TaskColumnProps {
  tasks: Task[];
  objectives: Objective[]; // All objectives (for dropdown in card edit)
  selectedObjectiveId: string | null;
  selectedTaskId: string | null;
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
  selectedObjective: Objective | null;
}

export function TaskColumn({
  tasks,
  objectives,
  selectedObjectiveId,
  selectedTaskId,
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
  selectedObjective,
}: TaskColumnProps) {
  const { user } = useAuth();
  const [showOrphaned, setShowOrphaned] = useState(true);
  const [recurringCompletedToday, setRecurringCompletedToday] = useState<Record<string, boolean>>({});

  // Split tasks into objective-attached and orphaned
  const objectiveTasks = selectedObjectiveId
    ? tasks.filter(t => t.objective_id === selectedObjectiveId)
    : tasks.filter(t => t.objective_id !== null);

  const orphanedTasks = tasks.filter(t => t.objective_id === null);

  const totalCount = objectiveTasks.length + (showOrphaned ? orphanedTasks.length : 0);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this task?')) {
      await onDeleteTask(id);
    }
  };

  // Check recurring task completions for today
  useEffect(() => {
    const checkRecurringCompletions = async () => {
      if (!user) return;

      const allTasks = [...objectiveTasks, ...orphanedTasks];
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
  }, [tasks, user, objectiveTasks, orphanedTasks]);

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
      onTitleClick={(e) => onTitleClick('task', task.title, task.notes || '', e)}
      onToggleStatus={() => onToggleTaskStatus(task)}
      onMarkRecurringCompletedToday={() => onMarkRecurringCompletedToday(task.id)}
      isRecurringCompletedToday={recurringCompletedToday[task.id] || false}
    />
  );

  return (
    <div className="flex-1 lg:min-w-[240px] xl:min-w-[260px] 2xl:min-w-[280px] 3xl:min-w-[320px] flex flex-col glass-card border border-white/40 max-w-full w-full shrink">
      <div className="p-4 border-b border-border-secondary/50 bg-white/30 dark:bg-white/5 backdrop-blur-sm relative overflow-visible z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="group relative z-20">
            <h2 className="font-heading font-bold text-lg text-text-primary cursor-help">Tasks</h2>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none whitespace-normal">
              <div className="font-semibold mb-1 text-purple-400">Best Use:</div>
              <p className="leading-relaxed">Daily or weekly actions that complete an objective. Small, concrete steps you can check off. Tasks can be one-time or recurring. Focus on what you can do today.</p>
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
          <span>Add Task</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="w-full space-y-6">
          {/* Objective-attached tasks section */}
          {selectedObjective ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider px-1">
                {selectedObjective.title}
              </h3>
              <div className="space-y-3">
                {objectiveTasks.length > 0 ? (
                  objectiveTasks.map(renderTaskCard)
                ) : (
                  <div className="text-center text-text-tertiary py-8 bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-border-secondary">
                    No tasks yet. Create one to get started!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {objectiveTasks.length > 0 ? (
                objectiveTasks.map(renderTaskCard)
              ) : !showOrphaned ? (
                <div className="text-center text-text-tertiary py-8 bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-border-secondary">
                  Select an objective to see tasks
                </div>
              ) : null}
            </div>
          )}

          {/* Orphaned tasks section */}
          <div>
            <button
              onClick={() => setShowOrphaned(!showOrphaned)}
              className="flex items-center gap-2 text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 px-1 hover:text-text-secondary transition-colors"
            >
              {showOrphaned ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Orphaned Tasks ({orphanedTasks.length})
            </button>
            {showOrphaned && (
              <div className="space-y-3">
                {orphanedTasks.length > 0 ? (
                  orphanedTasks.map(renderTaskCard)
                ) : (
                  <div className="text-center text-text-tertiary py-8 bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-border-secondary">
                    No orphaned tasks yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

