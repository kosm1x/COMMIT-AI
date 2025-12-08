import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Calendar } from 'lucide-react';

interface UpcomingDeadline {
  id: string;
  title: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  type: 'task' | 'goal' | 'objective';
}

export default function UpcomingDeadlines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUpcomingDeadlines();
    }
  }, [user]);

  const loadUpcomingDeadlines = async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const [tasksResult, goalsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, due_date, priority')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .not('due_date', 'is', null)
        .gte('due_date', now.toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5),
      supabase
        .from('goals')
        .select('id, title, target_date')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .not('target_date', 'is', null)
        .gte('target_date', now.toISOString().split('T')[0])
        .lte('target_date', nextWeek.toISOString().split('T')[0])
        .order('target_date', { ascending: true })
        .limit(3),
    ]);

    const deadlines: UpcomingDeadline[] = [];

    // Add tasks
    (tasksResult.data || []).forEach((task) => {
      deadlines.push({
        id: task.id,
        title: task.title,
        due_date: task.due_date!,
        priority: (task.priority || 'medium') as 'high' | 'medium' | 'low',
        type: 'task',
      });
    });

    // Add goals
    (goalsResult.data || []).forEach((goal) => {
      deadlines.push({
        id: goal.id,
        title: goal.title,
        due_date: goal.target_date!,
        priority: 'medium',
        type: 'goal',
      });
    });

    // Sort by date and limit to 5
    deadlines.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    setUpcomingDeadlines(deadlines.slice(0, 5));
    setLoading(false);
  };

  const formatDeadlineDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const deadlineDate = new Date(date);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate.getTime() === today.getTime()) return 'Today';
    if (deadlineDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const handleDeadlineClick = (deadline: UpcomingDeadline) => {
    // Navigate to Kanban board with the item selected and focused
    navigate('/boards', {
      state: {
        selectItem: {
          id: deadline.id,
          type: deadline.type,
          timestamp: Date.now(), // Ensure unique navigation
        },
        scrollTo: deadline.type === 'goal' ? 'goal' : 'task',
      },
    });
  };

  if (loading) {
    return (
      <div className="glass-card p-6 border border-white/40 dark:border-white/10 h-64 animate-pulse bg-white/20 dark:bg-white/5" />
    );
  }

  return (
    <div className="glass-card p-6 border border-white/40 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-text-primary">Upcoming Deadlines</h2>
            <p className="text-sm text-text-tertiary">What needs your attention soon</p>
          </div>
        </div>
        {upcomingDeadlines.length > 0 && (
          <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-bold border border-red-200 dark:border-red-800">
            {upcomingDeadlines.length} {upcomingDeadlines.length === 1 ? 'deadline' : 'deadlines'}
          </div>
        )}
      </div>
      <div className="space-y-3">
        {upcomingDeadlines.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No upcoming deadlines</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingDeadlines.map((deadline) => {
              const isToday = formatDeadlineDate(deadline.due_date) === 'Today';
              const isTomorrow = formatDeadlineDate(deadline.due_date) === 'Tomorrow';
              
              return (
                <div
                  key={deadline.id}
                  onClick={() => handleDeadlineClick(deadline)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                    isToday
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 shadow-md'
                      : isTomorrow
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 shadow-sm'
                      : 'bg-white dark:bg-white/5 border-white/50 dark:border-white/10'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ${
                      isToday
                        ? 'bg-red-500 dark:bg-red-600 text-white'
                        : isTomorrow
                        ? 'bg-orange-500 dark:bg-orange-600 text-white'
                        : 'bg-blue-500 dark:bg-blue-600 text-white'
                    }`}
                  >
                    {isToday ? 'Today' : isTomorrow ? 'Tmrw' : formatDeadlineDate(deadline.due_date)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate mb-1">{deadline.title}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${getPriorityColor(
                          deadline.priority
                        )}`}
                      >
                        {deadline.priority}
                      </span>
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wide">
                        {deadline.type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

