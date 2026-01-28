import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ListTodo, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDailyPlanner, TimeSlot } from '../../hooks/useDailyPlanner';
import { TaskSidebar } from './TaskSidebar';
import { TimeSlotColumn } from './TimeSlotColumn';
import { BottomSheet } from '../ui';
import { Task } from '../objectives/types';

interface DailyPlannerProps {
  userId: string;
}

const TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];

export function DailyPlanner({ userId }: DailyPlannerProps) {
  const { t } = useLanguage();
  const [showTaskSidebar, setShowTaskSidebar] = useState(false);
  
  const planner = useDailyPlanner(userId);

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(planner.selectedDate + 'T00:00:00');
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    planner.setSelectedDate(newDate);
  };

  const goToToday = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    planner.setSelectedDate(today);
  };

  const isToday = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return planner.selectedDate === today;
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: task.id
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropTask = async (taskId: string, slot: TimeSlot) => {
    await planner.addTaskToPlan(taskId, slot);
  };

  if (planner.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const totalPlanned = planner.plannedTasks.length;
  const totalCompleted = planner.plannedTasks.filter(pt => pt.task.status === 'completed').length;

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
      {/* Task Sidebar - Desktop */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <div className="h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <TaskSidebar
            tasks={planner.availableTasks}
            isTaskPlanned={planner.isTaskPlanned}
            onDragStart={handleDragStart}
          />
        </div>
      </div>

      {/* Main Planner Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Date Navigation */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile task sidebar toggle */}
            <button
              onClick={() => setShowTaskSidebar(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <ListTodo className="w-4 h-4" />
              <span>{t('planner.tasks')}</span>
              <span className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded">
                {planner.availableTasks.length}
              </span>
            </button>

            {/* Date navigation */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDisplayDate(planner.selectedDate)}
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{totalCompleted}/{totalPlanned} {t('planner.tasksCompleted')}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Today button */}
            {!isToday() && (
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                {t('planner.today')}
              </button>
            )}
          </div>
        </div>

        {/* Time Slots Grid */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {TIME_SLOTS.map(slot => (
            <TimeSlotColumn
              key={slot}
              slot={slot}
              tasks={planner.getTasksBySlot(slot)}
              onDropTask={handleDropTask}
              onRemoveTask={planner.removeTaskFromPlan}
              onToggleCompletion={planner.toggleTaskCompletion}
              onReorderTask={planner.reorderTaskInSlot}
            />
          ))}
        </div>

        {/* Empty state */}
        {planner.plannedTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('planner.dragTasksToStart')}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Task Sidebar Bottom Sheet */}
      <BottomSheet
        isOpen={showTaskSidebar}
        onClose={() => setShowTaskSidebar(false)}
        title={t('planner.pendingTasks')}
      >
        <div className="h-[60vh]">
          <TaskSidebar
            tasks={planner.availableTasks}
            isTaskPlanned={planner.isTaskPlanned}
            onDragStart={handleDragStart}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
