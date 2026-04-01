import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { getStartOfMonth, getEndOfMonth, getDaysInMonth } from '../../utils/trackingStats';
import { logger } from '../../utils/logger';

interface MonthlyStats {
  tasksCompleted: number;
  tasksTotal: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  goalsCompleted: number;
  goalsTotal: number;
}

interface DayActivity {
  date: Date;
  count: number;
}

interface MonthlyViewProps {
  selectedDate: Date;
}

export default function MonthlyView({ selectedDate }: MonthlyViewProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<MonthlyStats>({
    tasksCompleted: 0,
    tasksTotal: 0,
    objectivesCompleted: 0,
    objectivesTotal: 0,
    goalsCompleted: 0,
    goalsTotal: 0,
  });
  const [dailyActivity, setDailyActivity] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMonthlyData();
    }
  }, [user, selectedDate]);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const startOfMonth = getStartOfMonth(selectedDate);
      const endOfMonth = getEndOfMonth(selectedDate);

      // Fetch all tasks that were due in this month (non-recurring) - this is our baseline
      const { data: tasksDue } = await supabase
        .from('tasks')
        .select('id, status, completed_at, due_date')
        .eq('user_id', user!.id)
        .eq('is_recurring', false)
        .not('due_date', 'is', null)
        .gte('due_date', startOfMonth.toISOString().split('T')[0])
        .lte('due_date', endOfMonth.toISOString().split('T')[0]);

      // Fetch tasks completed in this month (non-recurring) - regardless of due date
      const { data: tasksCompleted } = await supabase
        .from('tasks')
        .select('id, status, completed_at, due_date')
        .eq('user_id', user!.id)
        .eq('is_recurring', false)
        .not('completed_at', 'is', null)
        .gte('completed_at', startOfMonth.toISOString())
        .lte('completed_at', endOfMonth.toISOString());

      // Fetch recurring task completions for this month
      const { data: recurringCompletions } = await supabase
        .from('task_completions')
        .select('task_id, completion_date')
        .eq('user_id', user!.id)
        .gte('completion_date', startOfMonth.toISOString().split('T')[0])
        .lte('completion_date', endOfMonth.toISOString().split('T')[0]);

      const [objectivesResult, goalsResult] = await Promise.all([
        supabase
          .from('objectives')
          .select('id, status')
          .eq('user_id', user!.id),
        supabase
          .from('goals')
          .select('id, status')
          .eq('user_id', user!.id),
      ]);

      const completedTasks = (tasksCompleted || []).filter((t) => {
        if (!t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        return completedDate >= startOfMonth && completedDate <= endOfMonth;
      });

      // Calculate proper monthly totals:
      // Total = all unique tasks due during the month (non-recurring only)
      // Completed = tasks due during the month that have status 'completed' (non-recurring only)
      // Note: Recurring task completions are excluded from percentage calculation to avoid > 100%
      const uniqueTasksDue = new Set((tasksDue || []).map(t => t.id));
      const tasksDueList = tasksDue || [];
      
      // Count tasks due during the month that are completed (by status) - non-recurring only
      const completedTasksDue = tasksDueList.filter(t => t.status === 'completed').length;
      
      const tasksTotal = uniqueTasksDue.size;
      const tasksCompletedCount = completedTasksDue;

      const daysInMonth = getDaysInMonth(selectedDate);
      const activity: DayActivity[] = [];

      for (let i = 1; i <= daysInMonth; i++) {
        const currentDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
        currentDay.setHours(0, 0, 0, 0);
        const nextDay = new Date(currentDay);
        nextDay.setDate(currentDay.getDate() + 1);
        const dayStr = currentDay.toISOString().split('T')[0];

        const dayCompletions = completedTasks.filter((task) => {
          const completedDate = new Date(task.completed_at!);
          completedDate.setHours(0, 0, 0, 0);
          return completedDate >= currentDay && completedDate < nextDay;
        });

        // Add recurring task completions for this day
        const recurringCompletionsCount = (recurringCompletions || []).filter(
          (rc) => rc.completion_date === dayStr
        ).length;

        activity.push({
          date: currentDay,
          count: dayCompletions.length + recurringCompletionsCount,
        });
      }

      setStats({
        tasksCompleted: tasksCompletedCount,
        tasksTotal: tasksTotal,
        objectivesCompleted: (objectivesResult.data || []).filter(o => o.status === 'completed').length,
        objectivesTotal: (objectivesResult.data || []).length,
        goalsCompleted: (goalsResult.data || []).filter(g => g.status === 'completed').length,
        goalsTotal: (goalsResult.data || []).length,
      });
      setDailyActivity(activity);
    } catch (error) {
      logger.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const maxActivity = Math.max(...dailyActivity.map(d => d.count), 1);
  const tasksPercentage = stats.tasksTotal > 0
    ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)
    : 0;

  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    const intensity = (count / maxActivity) * 100;
    if (intensity < 25) return 'bg-green-200 dark:bg-green-900/40 border-green-300 dark:border-green-800';
    if (intensity < 50) return 'bg-green-400 dark:bg-green-800/60 border-green-500 dark:border-green-700';
    if (intensity < 75) return 'bg-green-600 dark:bg-green-700/80 border-green-700 dark:border-green-600';
    return 'bg-green-700 dark:bg-green-600 border-green-800 dark:border-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const startingDayOfWeek = firstDayOfMonth.getDay();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-text-primary">{monthName}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-600 dark:bg-purple-500 p-3 rounded-xl shadow-lg shadow-purple-500/20">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-purple-900 dark:text-purple-100">{stats.tasksCompleted}</div>
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">{t('tracking.tasksCompletedLabel')}</p>
            </div>
          </div>
          <div className="w-full bg-purple-200/50 dark:bg-purple-900/50 rounded-full h-2">
            <div
              className="h-2 bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${tasksPercentage}%` }}
            />
          </div>
        </div>

        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-xl shadow-lg shadow-blue-500/20">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-blue-900 dark:text-blue-100">{stats.objectivesCompleted}</div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t('tracking.objectivesDone')}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/40 dark:border-white/10 bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 dark:bg-green-500 p-3 rounded-xl shadow-lg shadow-green-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-green-900 dark:text-green-100">{stats.goalsCompleted}</div>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">{t('tracking.goalsAchieved')}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-accent-primary" />
          <h3 className="text-lg font-heading font-bold text-text-primary">{t('tracking.activityHeatmap')}</h3>
        </div>
        <div className="glass-card p-6 border border-white/40 dark:border-white/10">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-text-tertiary uppercase tracking-wider">
                {t(`tracking.${day}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {dailyActivity.map((day, index) => {
              const isToday = day.date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-lg border-2 transition-all hover:scale-110 cursor-pointer relative group ${
                    isToday ? 'ring-2 ring-accent-primary' : ''
                  } ${getActivityColor(day.count)}`}
                  title={`${day.date.toLocaleDateString()}: ${day.count} ${t('tracking.tasksCompleted')}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${
                      day.count > 0 ? 'text-white drop-shadow-sm' : 'text-text-tertiary'
                    }`}>
                      {day.date.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-text-tertiary">
            <span className="font-medium">{t('tracking.lessActive')}</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700" />
              <div className="w-4 h-4 bg-green-200 dark:bg-green-900/40 rounded border border-green-300 dark:border-green-800" />
              <div className="w-4 h-4 bg-green-400 dark:bg-green-800/60 rounded border border-green-500 dark:border-green-700" />
              <div className="w-4 h-4 bg-green-600 dark:bg-green-700/80 rounded border border-green-700 dark:border-green-600" />
              <div className="w-4 h-4 bg-green-700 dark:bg-green-600 rounded border border-green-800 dark:border-green-500" />
            </div>
            <span className="font-medium">{t('tracking.moreActive')}</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border border-white/40 dark:border-white/10">
        <h3 className="text-lg font-heading font-bold text-text-primary mb-4">{t('tracking.monthlySummary')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-heading font-bold text-text-primary">{stats.tasksTotal}</div>
            <div className="text-sm text-text-secondary font-medium">{t('tracking.totalTasks')}</div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold text-text-primary">{stats.objectivesTotal}</div>
            <div className="text-sm text-text-secondary font-medium">{t('tracking.totalObjectives')}</div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold text-text-primary">{stats.goalsTotal}</div>
            <div className="text-sm text-text-secondary font-medium">{t('tracking.totalGoals')}</div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold text-blue-600 dark:text-blue-400">
              {dailyActivity.filter(d => d.count > 0).length}
            </div>
            <div className="text-sm text-text-secondary font-medium">{t('tracking.activeDays')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
