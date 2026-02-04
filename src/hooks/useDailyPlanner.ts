import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Task, Goal, Objective } from '../components/objectives/types';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface PlannedTask {
  id: string;
  daily_plan_id: string;
  task_id: string;
  time_slot: TimeSlot;
  order_index: number;
  created_at: string;
  // Joined task data
  task: Task & {
    objective?: Objective | null;
    goal?: Goal | null;
  };
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailyPlannerState {
  // Current date being viewed
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  
  // Daily plan for selected date
  dailyPlan: DailyPlan | null;
  plannedTasks: PlannedTask[];
  
  // All available tasks (pending/in-progress)
  availableTasks: (Task & { objective?: Objective | null; goal?: Goal | null })[];
  
  // Loading states
  loading: boolean;
  
  // Actions
  addTaskToPlan: (taskId: string, timeSlot: TimeSlot) => Promise<boolean>;
  removeTaskFromPlan: (plannedTaskId: string) => Promise<boolean>;
  moveTaskToSlot: (plannedTaskId: string, newTimeSlot: TimeSlot) => Promise<boolean>;
  reorderTaskInSlot: (plannedTaskId: string, newOrderIndex: number) => Promise<boolean>;
  toggleTaskCompletion: (taskId: string) => Promise<boolean>;
  updatePlanNotes: (notes: string) => Promise<boolean>;
  
  // Helpers
  getTasksBySlot: (slot: TimeSlot) => PlannedTask[];
  isTaskPlanned: (taskId: string) => boolean;
  
  // Reload
  reload: () => Promise<void>;
}

export function useDailyPlanner(userId: string | undefined): DailyPlannerState {
  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);
  const [availableTasks, setAvailableTasks] = useState<(Task & { objective?: Objective | null; goal?: Goal | null })[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all available tasks (not completed)
  const loadAvailableTasks = useCallback(async () => {
    if (!userId) return;

    // Load tasks with their objectives and goals
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['not_started', 'in_progress'])
      .order('created_at', { ascending: false });

    if (!tasks) {
      setAvailableTasks([]);
      return;
    }

    // Load objectives for context
    const objectiveIds = [...new Set(tasks.filter(t => t.objective_id).map(t => t.objective_id))];
    const { data: objectives } = objectiveIds.length > 0
      ? await supabase.from('objectives').select('*').in('id', objectiveIds)
      : { data: [] };

    // Load goals for context
    const goalIds = [...new Set((objectives || []).filter(o => o.goal_id).map(o => o.goal_id))];
    const { data: goals } = goalIds.length > 0
      ? await supabase.from('goals').select('*').in('id', goalIds)
      : { data: [] };

    // Map objectives and goals to tasks
    const objectivesMap = new Map((objectives || []).map(o => [o.id, o]));
    const goalsMap = new Map((goals || []).map(g => [g.id, g]));

    const enrichedTasks = tasks.map(task => {
      const objective = task.objective_id ? objectivesMap.get(task.objective_id) : null;
      const goal = objective?.goal_id ? goalsMap.get(objective.goal_id) : null;
      return { ...task, objective, goal };
    });

    setAvailableTasks(enrichedTasks);
  }, [userId]);

  // Load daily plan for selected date
  const loadDailyPlan = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    // Get or create daily plan for the date
    let { data: plan } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', selectedDate)
      .single();

    setDailyPlan(plan);

    if (!plan) {
      setPlannedTasks([]);
      setLoading(false);
      return;
    }

    // Load planned tasks with joined task data
    const { data: planTasks } = await supabase
      .from('daily_plan_tasks')
      .select('*')
      .eq('daily_plan_id', plan.id)
      .order('order_index', { ascending: true });

    if (!planTasks || planTasks.length === 0) {
      setPlannedTasks([]);
      setLoading(false);
      return;
    }

    // Load the actual task data
    const taskIds = planTasks.map(pt => pt.task_id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds);

    // Load objectives for context
    const objectiveIds = [...new Set((tasks || []).filter(t => t.objective_id).map(t => t.objective_id))];
    const { data: objectives } = objectiveIds.length > 0
      ? await supabase.from('objectives').select('*').in('id', objectiveIds)
      : { data: [] };

    // Load goals for context
    const goalIds = [...new Set((objectives || []).filter(o => o.goal_id).map(o => o.goal_id))];
    const { data: goals } = goalIds.length > 0
      ? await supabase.from('goals').select('*').in('id', goalIds)
      : { data: [] };

    const tasksMap = new Map((tasks || []).map(t => [t.id, t]));
    const objectivesMap = new Map((objectives || []).map(o => [o.id, o]));
    const goalsMap = new Map((goals || []).map(g => [g.id, g]));

    const enrichedPlannedTasks: PlannedTask[] = planTasks
      .map(pt => {
        const task = tasksMap.get(pt.task_id);
        if (!task) return null;
        const objective = task.objective_id ? objectivesMap.get(task.objective_id) : null;
        const goal = objective?.goal_id ? goalsMap.get(objective.goal_id) : null;
        return {
          ...pt,
          task: { ...task, objective, goal }
        };
      })
      .filter((pt): pt is PlannedTask => pt !== null);

    setPlannedTasks(enrichedPlannedTasks);
    setLoading(false);
  }, [userId, selectedDate]);

  // Create daily plan if it doesn't exist
  const ensureDailyPlan = useCallback(async (): Promise<DailyPlan | null> => {
    if (!userId) return null;

    if (dailyPlan) return dailyPlan;

    const { data: newPlan, error } = await supabase
      .from('daily_plans')
      .insert({
        user_id: userId,
        plan_date: selectedDate,
        notes: ''
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating daily plan:', error);
      return null;
    }

    setDailyPlan(newPlan);
    return newPlan;
  }, [userId, selectedDate, dailyPlan]);

  // Add task to plan
  const addTaskToPlan = useCallback(async (taskId: string, timeSlot: TimeSlot): Promise<boolean> => {
    const plan = await ensureDailyPlan();
    if (!plan) return false;

    // Check if task is already planned
    const existing = plannedTasks.find(pt => pt.task_id === taskId);
    if (existing) {
      // Move to new slot instead
      return moveTaskToSlot(existing.id, timeSlot);
    }

    // Get max order index for this slot
    const slotTasks = plannedTasks.filter(pt => pt.time_slot === timeSlot);
    const maxOrder = slotTasks.length > 0 ? Math.max(...slotTasks.map(pt => pt.order_index)) : -1;

    const { error } = await supabase
      .from('daily_plan_tasks')
      .insert({
        daily_plan_id: plan.id,
        task_id: taskId,
        time_slot: timeSlot,
        order_index: maxOrder + 1
      });

    if (error) {
      console.error('Error adding task to plan:', error);
      return false;
    }

    // Reload to get enriched data
    await loadDailyPlan();
    return true;
  }, [ensureDailyPlan, plannedTasks, loadDailyPlan]);

  // Remove task from plan
  const removeTaskFromPlan = useCallback(async (plannedTaskId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('daily_plan_tasks')
      .delete()
      .eq('id', plannedTaskId);

    if (error) {
      console.error('Error removing task from plan:', error);
      return false;
    }

    setPlannedTasks(prev => prev.filter(pt => pt.id !== plannedTaskId));
    return true;
  }, []);

  // Move task to different slot
  const moveTaskToSlot = useCallback(async (plannedTaskId: string, newTimeSlot: TimeSlot): Promise<boolean> => {
    // Get max order index for new slot
    const slotTasks = plannedTasks.filter(pt => pt.time_slot === newTimeSlot && pt.id !== plannedTaskId);
    const maxOrder = slotTasks.length > 0 ? Math.max(...slotTasks.map(pt => pt.order_index)) : -1;

    const { error } = await supabase
      .from('daily_plan_tasks')
      .update({
        time_slot: newTimeSlot,
        order_index: maxOrder + 1
      })
      .eq('id', plannedTaskId);

    if (error) {
      console.error('Error moving task to slot:', error);
      return false;
    }

    setPlannedTasks(prev => prev.map(pt =>
      pt.id === plannedTaskId
        ? { ...pt, time_slot: newTimeSlot, order_index: maxOrder + 1 }
        : pt
    ));
    return true;
  }, [plannedTasks]);

  // Reorder task within slot
  const reorderTaskInSlot = useCallback(async (plannedTaskId: string, newOrderIndex: number): Promise<boolean> => {
    const { error } = await supabase
      .from('daily_plan_tasks')
      .update({ order_index: newOrderIndex })
      .eq('id', plannedTaskId);

    if (error) {
      console.error('Error reordering task:', error);
      return false;
    }

    setPlannedTasks(prev => prev.map(pt =>
      pt.id === plannedTaskId ? { ...pt, order_index: newOrderIndex } : pt
    ));
    return true;
  }, []);

  // Toggle task completion (affects original task)
  const toggleTaskCompletion = useCallback(async (taskId: string): Promise<boolean> => {
    const task = availableTasks.find(t => t.id === taskId) ||
                 plannedTasks.find(pt => pt.task_id === taskId)?.task;
    
    if (!task) return false;

    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: completedAt,
        last_edited_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error toggling task completion:', error);
      return false;
    }

    // Update local state
    setPlannedTasks(prev => prev.map(pt =>
      pt.task_id === taskId
        ? { ...pt, task: { ...pt.task, status: newStatus, completed_at: completedAt } }
        : pt
    ));

    // Reload available tasks to reflect changes
    await loadAvailableTasks();
    return true;
  }, [availableTasks, plannedTasks, loadAvailableTasks]);

  // Update plan notes
  const updatePlanNotes = useCallback(async (notes: string): Promise<boolean> => {
    const plan = await ensureDailyPlan();
    if (!plan) return false;

    const { error } = await supabase
      .from('daily_plans')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', plan.id);

    if (error) {
      console.error('Error updating plan notes:', error);
      return false;
    }

    setDailyPlan(prev => prev ? { ...prev, notes } : null);
    return true;
  }, [ensureDailyPlan]);

  // Get tasks by slot
  const getTasksBySlot = useCallback((slot: TimeSlot): PlannedTask[] => {
    return plannedTasks
      .filter(pt => pt.time_slot === slot)
      .sort((a, b) => a.order_index - b.order_index);
  }, [plannedTasks]);

  // Check if task is already planned
  const isTaskPlanned = useCallback((taskId: string): boolean => {
    return plannedTasks.some(pt => pt.task_id === taskId);
  }, [plannedTasks]);

  // Reload all data
  const reload = useCallback(async () => {
    await Promise.all([loadAvailableTasks(), loadDailyPlan()]);
  }, [loadAvailableTasks, loadDailyPlan]);

  // Initial load
  useEffect(() => {
    if (userId) {
      loadAvailableTasks();
    }
  }, [userId, loadAvailableTasks]);

  // Load plan when date changes
  useEffect(() => {
    if (userId) {
      loadDailyPlan();
    }
  }, [userId, selectedDate, loadDailyPlan]);

  return {
    selectedDate,
    setSelectedDate,
    dailyPlan,
    plannedTasks,
    availableTasks,
    loading,
    addTaskToPlan,
    removeTaskFromPlan,
    moveTaskToSlot,
    reorderTaskInSlot,
    toggleTaskCompletion,
    updatePlanNotes,
    getTasksBySlot,
    isTaskPlanned,
    reload
  };
}
