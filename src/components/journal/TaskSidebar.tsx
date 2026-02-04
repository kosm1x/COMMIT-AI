import { useState } from 'react';
import { Search, ListTodo, Target, Flag, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Task, Objective, Goal } from '../objectives/types';

interface TaskSidebarProps {
  tasks: (Task & { objective?: Objective | null; goal?: Goal | null })[];
  isTaskPlanned: (taskId: string) => boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

export function TaskSidebar({ tasks, isTaskPlanned, onDragStart }: TaskSidebarProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress'>('all');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group tasks by goal
  const tasksByGoal = filteredTasks.reduce((acc, task) => {
    const goalId = task.goal?.id || 'orphaned';
    const goalTitle = task.goal?.title || t('planner.noGoal');
    if (!acc[goalId]) {
      acc[goalId] = { title: goalTitle, tasks: [] };
    }
    acc[goalId].tasks.push(task);
    return acc;
  }, {} as Record<string, { title: string; tasks: typeof filteredTasks }>);

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  // Expand all by default on first render
  if (expandedGoals.size === 0 && Object.keys(tasksByGoal).length > 0) {
    setExpandedGoals(new Set(Object.keys(tasksByGoal)));
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('planner.inProgress')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <ListTodo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('planner.pendingTasks')}</h2>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('planner.searchTasks')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t('planner.all')}
          </button>
          <button
            onClick={() => setStatusFilter('not_started')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'not_started'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t('planner.notStarted')}
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'in_progress'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t('planner.inProgress')}
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(tasksByGoal).map(([goalId, { title, tasks: goalTasks }]) => (
          <div key={goalId}>
            <button
              onClick={() => toggleGoalExpanded(goalId)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {expandedGoals.has(goalId) ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Target className="w-3 h-3 text-blue-500" />
              <span className="truncate">{title}</span>
              <span className="ml-auto text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {goalTasks.length}
              </span>
            </button>

            {expandedGoals.has(goalId) && (
              <div className="mt-1 space-y-1.5 pl-2">
                {goalTasks.map(task => {
                  const planned = isTaskPlanned(task.id);
                  return (
                    <div
                      key={task.id}
                      draggable={!planned}
                      onDragStart={(e) => !planned && onDragStart(e, task)}
                      className={`p-3 rounded-lg border transition-all ${
                        planned
                          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-grab hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 active:cursor-grabbing'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {task.title}
                            </h4>
                            {getStatusBadge(task.status)}
                          </div>
                          {task.objective && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                              <Flag className="w-2.5 h-2.5" />
                              <span className="truncate">{task.objective.title}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {planned && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                {t('planner.planned')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all'
              ? t('planner.noTasksMatch')
              : t('planner.noTasksAvailable')}
          </div>
        )}
      </div>
    </div>
  );
}
