import { useState } from 'react';
import { Sun, Cloud, Moon, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TimeSlot, PlannedTask } from '../../hooks/useDailyPlanner';
import { PlannedTaskCard } from './PlannedTaskCard';

interface TimeSlotColumnProps {
  slot: TimeSlot;
  tasks: PlannedTask[];
  onDropTask: (taskId: string, slot: TimeSlot) => void;
  onRemoveTask: (plannedTaskId: string) => void;
  onToggleCompletion: (taskId: string) => void;
  onReorderTask: (plannedTaskId: string, newIndex: number) => void;
}

const slotConfig: Record<TimeSlot, { icon: typeof Sun; color: string; bgColor: string; timeRange: string }> = {
  morning: {
    icon: Sun,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    timeRange: '5am - 12pm'
  },
  afternoon: {
    icon: Cloud,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    timeRange: '12pm - 5pm'
  },
  evening: {
    icon: Moon,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    timeRange: '5pm - 9pm'
  },
  night: {
    icon: Star,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    timeRange: '9pm - 5am'
  }
};

export function TimeSlotColumn({
  slot,
  tasks,
  onDropTask,
  onRemoveTask,
  onToggleCompletion,
  // onReorderTask is available for future drag-to-reorder within slots
}: TimeSlotColumnProps) {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const config = slotConfig[slot];
  const Icon = config.icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.taskId) {
          onDropTask(parsed.taskId, slot);
        }
      }
    } catch (err) {
      console.error('Error parsing drop data:', err);
    }
  };

  const handleTaskDragStart = (e: React.DragEvent, plannedTask: PlannedTask) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: plannedTask.task_id,
      plannedTaskId: plannedTask.id,
      fromSlot: slot
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const completedCount = tasks.filter(t => t.task.status === 'completed').length;

  return (
    <div className="flex flex-col flex-1 min-w-[200px]">
      {/* Header */}
      <div className={`px-4 py-3 ${config.bgColor} rounded-t-xl border-x border-t border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color}`} />
            <div>
              <h3 className={`font-semibold ${config.color}`}>
                {t(`planner.${slot}`)}
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {config.timeRange}
              </p>
            </div>
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {completedCount}/{tasks.length}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 p-3 space-y-2 rounded-b-xl border border-gray-200 dark:border-gray-700 transition-colors min-h-[200px] ${
          isDragOver
            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 border-dashed'
            : 'bg-gray-50 dark:bg-gray-900/50'
        }`}
      >
        {tasks.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full min-h-[150px] text-center ${
            isDragOver ? 'opacity-0' : 'opacity-100'
          }`}>
            <Icon className={`w-8 h-8 ${config.color} opacity-30 mb-2`} />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('planner.dropTasksHere')}
            </p>
          </div>
        ) : (
          tasks.map((plannedTask, index) => (
            <PlannedTaskCard
              key={plannedTask.id}
              plannedTask={plannedTask}
              onRemove={() => onRemoveTask(plannedTask.id)}
              onToggleCompletion={() => onToggleCompletion(plannedTask.task_id)}
              onDragStart={(e) => handleTaskDragStart(e, plannedTask)}
              index={index}
            />
          ))
        )}

        {isDragOver && (
          <div className="border-2 border-dashed border-indigo-400 dark:border-indigo-500 rounded-lg p-4 text-center">
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {t('planner.dropHere')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
