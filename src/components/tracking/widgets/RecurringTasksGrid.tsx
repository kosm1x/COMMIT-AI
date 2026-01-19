import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Repeat } from 'lucide-react';

interface RecurringTask {
  id: string;
  title: string;
  completions: string[]; // Array of completion dates
}

// Bright, vibrant color palette for task dots
const BRIGHT_COLORS = [
  { bg: 'bg-blue-500', shadow: 'shadow-[0_0_4px_rgba(59,130,246,0.6)]' },
  { bg: 'bg-emerald-500', shadow: 'shadow-[0_0_4px_rgba(16,185,129,0.6)]' },
  { bg: 'bg-purple-500', shadow: 'shadow-[0_0_4px_rgba(168,85,247,0.6)]' },
  { bg: 'bg-pink-500', shadow: 'shadow-[0_0_4px_rgba(236,72,153,0.6)]' },
  { bg: 'bg-orange-500', shadow: 'shadow-[0_0_4px_rgba(249,115,22,0.6)]' },
  { bg: 'bg-cyan-500', shadow: 'shadow-[0_0_4px_rgba(6,182,212,0.6)]' },
  { bg: 'bg-yellow-500', shadow: 'shadow-[0_0_4px_rgba(234,179,8,0.6)]' },
  { bg: 'bg-red-500', shadow: 'shadow-[0_0_4px_rgba(239,68,68,0.6)]' },
  { bg: 'bg-indigo-500', shadow: 'shadow-[0_0_4px_rgba(99,102,241,0.6)]' },
  { bg: 'bg-teal-500', shadow: 'shadow-[0_0_4px_rgba(20,184,166,0.6)]' },
  { bg: 'bg-rose-500', shadow: 'shadow-[0_0_4px_rgba(244,63,94,0.6)]' },
  { bg: 'bg-amber-500', shadow: 'shadow-[0_0_4px_rgba(245,158,11,0.6)]' },
];

// Generate a consistent color for a task based on its ID
const getTaskColor = (taskId: string): { bg: string; shadow: string } => {
  // Simple hash function to convert task ID to a number
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % BRIGHT_COLORS.length;
  return BRIGHT_COLORS[index];
};

export default function RecurringTasksGrid() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null); // task_id-date format

  // Calculate grid dates (4 weeks aligned to Monday-Sunday)
  const getGridDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Calculate days to subtract to get to this week's Monday
    // If Sun (0), subtract 6. If Mon (1), subtract 0. If Tue (2), subtract 1...
    const diffToMonday = (dayOfWeek + 6) % 7;
    
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() - diffToMonday);
    
    // We want 4 rows (4 weeks), so start date is 3 weeks before current week's Monday
    const startDate = new Date(currentWeekMonday);
    startDate.setDate(startDate.getDate() - 21); // 3 weeks back
    
    const days: string[] = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const gridDates = getGridDates();
  const startDateStr = gridDates[0];
  const endDateStr = gridDates[gridDates.length - 1];

  useEffect(() => {
    if (user) {
      fetchRecurringTasks();
    }
  }, [user]);

  const fetchRecurringTasks = async () => {
    try {
      // 1. Fetch recurring tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', user!.id)
        .eq('is_recurring', true)
        .neq('status', 'completed');

      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const taskIds = tasksData.map(t => t.id);

      // 2. Fetch completions within our grid range
      const { data: completionsData, error: completionsError } = await supabase
        .from('task_completions')
        .select('task_id, completion_date')
        .in('task_id', taskIds)
        .gte('completion_date', startDateStr)
        .lte('completion_date', endDateStr);

      if (completionsError) throw completionsError;

      // 3. Merge data
      const tasksWithCompletions: RecurringTask[] = tasksData.map(task => ({
        id: task.id,
        title: task.title,
        completions: completionsData
          ?.filter(c => c.task_id === task.id)
          .map(c => c.completion_date) || []
      }));

      setTasks(tasksWithCompletions);
    } catch (error) {
      console.error('Error fetching recurring tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletion = async (taskId: string, date: string) => {
    const toggleKey = `${taskId}-${date}`;
    if (toggling === toggleKey) return; // Prevent double-clicks

    setToggling(toggleKey);

    try {
      const isCompleted = tasks.find(t => t.id === taskId)?.completions.includes(date);

      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from('task_completions')
          .delete()
          .eq('task_id', taskId)
          .eq('completion_date', date)
          .eq('user_id', user!.id);

        if (error) throw error;
      } else {
        // Add completion
        const { error } = await supabase
          .from('task_completions')
          .insert({
            task_id: taskId,
            user_id: user!.id,
            completion_date: date,
          });

        if (error) throw error;
      }

      // Optimistically update UI
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            completions: isCompleted
              ? task.completions.filter(d => d !== date)
              : [...task.completions, date]
          };
        }
        return task;
      }));
    } catch (error) {
      console.error('Error toggling completion:', error);
      // Reload on error
      await fetchRecurringTasks();
    } finally {
      setToggling(null);
    }
  };

  if (loading) return null;
  if (tasks.length === 0) return null;

  return (
    <div className="glass-card p-5 border border-white/40 dark:border-white/10">
      <h3 className="font-heading font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
        <Repeat className="w-5 h-5 text-accent-primary" />
        {t('tracking.dailyHabits')}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tasks.map(task => {
          const taskColor = getTaskColor(task.id);
          
          return (
            <div key={task.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary truncate pr-2" title={task.title}>
                  {task.title}
                </span>
                <span className="text-xs text-text-tertiary font-mono">
                  {task.completions.length}
                </span>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {gridDates.map((date) => {
                  const isCompleted = task.completions.includes(date);
                  const isToday = date === new Date().toISOString().split('T')[0];
                  const dateObj = new Date(date);
                  const isFuture = dateObj > new Date();
                  const toggleKey = `${task.id}-${date}`;
                  const isToggling = toggling === toggleKey;

                  return (
                    <button
                      key={date}
                      onClick={() => !isFuture && toggleCompletion(task.id, date)}
                      disabled={isFuture || isToggling}
                      className={`
                        w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center
                        ${isCompleted 
                          ? `${taskColor.bg} ${taskColor.shadow}` 
                          : isFuture
                            ? 'bg-black/5 dark:bg-white/5 opacity-30 cursor-not-allowed' 
                            : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 cursor-pointer'
                        }
                        ${isToday ? 'ring-2 ring-accent-primary ring-offset-2 dark:ring-offset-black' : ''}
                        ${!isFuture && !isToggling ? 'hover:scale-110' : ''}
                        ${isToggling ? 'opacity-50 cursor-wait' : ''}
                      `}
                      title={`${date}${isCompleted ? ` - ${t('tracking.completedLabel')}` : ''}\n${!isFuture ? t('tracking.clickToToggle') : ''}`}
                    >
                      {isCompleted && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
