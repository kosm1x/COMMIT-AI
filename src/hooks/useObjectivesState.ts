import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Vision, Goal, Objective, Task } from '../components/objectives/types';
import { hasSessionSorted, markSessionSorted, sortGoals, sortObjectives, sortTasks } from '../utils/autoSort';

// Selection path represents the currently active selection at each level
export interface SelectionPath {
  visionId: string | null;
  goalId: string | null;
  objectiveId: string | null;
  taskId: string | null;
}

// The full state returned by the hook
export interface ObjectivesState {
  // Raw data (all items regardless of selection)
  visions: Vision[];
  goals: Goal[];
  objectives: Objective[];
  tasks: Task[];
  
  // Selected items (resolved from IDs)
  selectedVision: Vision | null;
  selectedGoal: Goal | null;
  selectedObjective: Objective | null;
  selectedTask: Task | null;
  
  // Selection path for external access
  selectionPath: SelectionPath;
  
  // Loading states
  loading: boolean;
  
  // Task counts per objective
  taskCounts: Record<string, { total: number; completed: number }>;
  
  // Computed visibility helpers
  getVisibleGoals: () => Goal[];
  getVisibleObjectives: () => Objective[];
  getVisibleTasks: () => Task[];
  
  // Orphan lists (convenience)
  orphanedGoals: Goal[];
  orphanedObjectives: Objective[];
  orphanedTasks: Task[];
  
  // Family tree helpers for emphasis
  isInSelectedFamily: (type: 'vision' | 'goal' | 'objective' | 'task', id: string) => boolean;
  
  // Selection actions
  selectVision: (vision: Vision | null) => void;
  selectGoal: (goal: Goal | null) => void;
  selectObjective: (objective: Objective | null) => void;
  selectTask: (task: Task | null) => void;
  clearSelection: () => void;
  
  // CRUD operations
  createVision: (title: string, description: string, targetDate: string) => Promise<Vision | null>;
  updateVision: (id: string, updates: Partial<Vision>) => Promise<boolean>;
  deleteVision: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  updateVisionOrder: (visionId: string, newOrder: number) => Promise<void>;
  getVisionDescendantCounts: (id: string) => Promise<{ goals: number; objectives: number; tasks: number }>;
  
  createGoal: (title: string, description: string, targetDate: string, visionId: string | null) => Promise<Goal | null>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<boolean>;
  deleteGoal: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  getGoalDescendantCounts: (id: string) => Promise<{ objectives: number; tasks: number }>;
  toggleGoalStatus: (goal: Goal) => Promise<void>;
  
  createObjective: (title: string, description: string, priority: string, goalId: string | null, targetDate: string) => Promise<Objective | null>;
  updateObjective: (id: string, updates: Partial<Objective>) => Promise<boolean>;
  deleteObjective: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  getObjectiveDescendantCounts: (id: string) => Promise<{ tasks: number }>;
  toggleObjectiveStatus: (objective: Objective) => Promise<void>;
  
  createTask: (title: string, description: string, priority: string, dueDate: string, objectiveId: string | null, isRecurring: boolean) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskStatus: (task: Task) => Promise<void>;
  markRecurringTaskCompletedToday: (taskId: string) => Promise<void>;
  
  // Conversion functions (convert between types)
  convertVisionToGoal: (vision: Vision, targetVisionId: string | null) => Promise<Goal | null>;
  convertGoalToVision: (goal: Goal) => Promise<Vision | null>;
  convertGoalToObjective: (goal: Goal, targetGoalId: string | null) => Promise<Objective | null>;
  convertObjectiveToGoal: (objective: Objective, targetVisionId: string | null) => Promise<Goal | null>;
  convertObjectiveToTask: (objective: Objective, targetObjectiveId: string | null) => Promise<Task | null>;
  convertTaskToObjective: (task: Task, targetGoalId: string | null) => Promise<Objective | null>;
  
  // Reload functions
  reloadAll: () => Promise<void>;
  reloadVisions: () => Promise<void>;
  reloadGoals: () => Promise<void>;
  reloadObjectives: () => Promise<void>;
  reloadTasks: () => Promise<void>;
}

export function useObjectivesState(userId: string | undefined): ObjectivesState {
  // Raw data states
  const [visions, setVisions] = useState<Vision[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [loading, setLoading] = useState(false);
  
  // Selection path state
  const [selectionPath, setSelectionPath] = useState<SelectionPath>({
    visionId: null,
    goalId: null,
    objectiveId: null,
    taskId: null,
  });

  // ===== DATA LOADING =====
  const loadVisions = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('visions')
      .select('id, title, description, status, target_date, "order", last_edited_at')
      .eq('user_id', userId)
      .order('order', { ascending: true })
      .order('created_at', { ascending: true });
    if (data) setVisions(data);
  }, [userId]);

  const loadGoals = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('goals')
      .select('id, vision_id, title, description, status, target_date, last_edited_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data) setGoals(data);
  }, [userId]);

  const loadObjectives = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('objectives')
      .select('id, goal_id, title, description, status, priority, target_date, last_edited_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data) setObjectives(data);
  }, [userId]);

  const loadTasks = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, objective_id, title, description, status, priority, due_date, completed_at, notes, document_links, last_edited_at, is_recurring')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data) setTasks(data);
  }, [userId]);

  // Compute task counts locally from tasks array (no extra API call needed)
  // This is more efficient since we already have all tasks loaded
  const computedTaskCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(task => {
      if (task.objective_id) {
        if (!counts[task.objective_id]) {
          counts[task.objective_id] = { total: 0, completed: 0 };
        }
        counts[task.objective_id].total++;
        if (task.status === 'completed') {
          counts[task.objective_id].completed++;
        }
      }
    });
    return counts;
  }, [tasks]);
  
  // Keep the loadTaskCounts for backwards compatibility, but it now just syncs computed counts
  const loadTaskCounts = useCallback(async () => {
    setTaskCounts(computedTaskCounts);
  }, [computedTaskCounts]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadVisions(), loadGoals(), loadObjectives(), loadTasks()]);
    setLoading(false);
  }, [loadVisions, loadGoals, loadObjectives, loadTasks]);

  const hasAppliedSessionSort = useRef(false);

  // Initial load
  useEffect(() => {
    if (userId) {
      reloadAll();
    } else {
      setLoading(false);
    }
  }, [userId, reloadAll]);

  // One-time per session auto-sort after initial load
  useEffect(() => {
    if (!loading && goals.length > 0 && !hasAppliedSessionSort.current && !hasSessionSorted()) {
      hasAppliedSessionSort.current = true;
      markSessionSorted();
      setGoals(prev => sortGoals(prev));
      setObjectives(prev => sortObjectives(prev));
      setTasks(prev => sortTasks(prev));
    }
  }, [loading, goals.length]);

  // Sync task counts when computed counts change
  useEffect(() => {
    setTaskCounts(computedTaskCounts);
  }, [computedTaskCounts]);

  // ===== RESOLVED SELECTIONS =====
  const selectedVision = useMemo(() => 
    visions.find(v => v.id === selectionPath.visionId) || null,
    [visions, selectionPath.visionId]
  );

  const selectedGoal = useMemo(() => 
    goals.find(g => g.id === selectionPath.goalId) || null,
    [goals, selectionPath.goalId]
  );

  const selectedObjective = useMemo(() => 
    objectives.find(o => o.id === selectionPath.objectiveId) || null,
    [objectives, selectionPath.objectiveId]
  );

  const selectedTask = useMemo(() => 
    tasks.find(t => t.id === selectionPath.taskId) || null,
    [tasks, selectionPath.taskId]
  );

  // ===== ORPHAN LISTS =====
  const orphanedGoals = useMemo(() => 
    goals.filter(g => g.vision_id === null),
    [goals]
  );

  const orphanedObjectives = useMemo(() => 
    objectives.filter(o => o.goal_id === null),
    [objectives]
  );

  const orphanedTasks = useMemo(() => 
    tasks.filter(t => t.objective_id === null),
    [tasks]
  );

  // ===== LOOKUP MAPS FOR O(1) ACCESS =====
  // These maps enable efficient lookups in isInSelectedFamily and other computed properties
  const goalsById = useMemo(() => {
    const map = new Map<string, Goal>();
    goals.forEach(g => map.set(g.id, g));
    return map;
  }, [goals]);

  const objectivesById = useMemo(() => {
    const map = new Map<string, Objective>();
    objectives.forEach(o => map.set(o.id, o));
    return map;
  }, [objectives]);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach(t => map.set(t.id, t));
    return map;
  }, [tasks]);

  // ===== VISIBILITY LOGIC =====
  // Goals visible: belongs to selected vision OR is orphan (when no vision selected or showing orphans section)
  const getVisibleGoals = useCallback(() => {
    if (selectionPath.visionId) {
      return goals.filter(g => g.vision_id === selectionPath.visionId);
    }
    return goals;
  }, [goals, selectionPath.visionId]);

  // Objectives visible: belongs to selected goal OR is orphan
  const getVisibleObjectives = useCallback(() => {
    if (selectionPath.goalId) {
      return objectives.filter(o => o.goal_id === selectionPath.goalId);
    }
    return objectives;
  }, [objectives, selectionPath.goalId]);

  // Tasks visible: belongs to selected objective OR is orphan
  const getVisibleTasks = useCallback(() => {
    if (selectionPath.objectiveId) {
      return tasks.filter(t => t.objective_id === selectionPath.objectiveId);
    }
    return tasks;
  }, [tasks, selectionPath.objectiveId]);

  // ===== FAMILY TREE HELPERS =====
  // Effective selection path: resolve full ancestor chain from leaf selection so filtering is consistent
  // when user selects a goal/objective/task without having selected the vision first.
  const effectivePath = useMemo(() => {
    const { visionId, goalId, objectiveId, taskId } = selectionPath;
    let effVision: string | null = visionId ?? null;
    let effGoal: string | null = goalId ?? null;
    let effObjective: string | null = objectiveId ?? null;
    const effTask: string | null = taskId ?? null;

    if (taskId) {
      const task = tasksById.get(taskId);
      if (task?.objective_id) {
        const obj = objectivesById.get(task.objective_id);
        if (obj) {
          if (effObjective === null) effObjective = obj.id;
          if (effGoal === null && obj.goal_id) effGoal = obj.goal_id;
          if (effVision === null && obj.goal_id) {
            const g = goalsById.get(obj.goal_id);
            if (g?.vision_id) effVision = g.vision_id;
          }
        }
      }
    }
    if (objectiveId && (effGoal === null || effVision === null)) {
      const obj = objectivesById.get(objectiveId);
      if (obj?.goal_id) {
        if (effGoal === null) effGoal = obj.goal_id;
        if (effVision === null) {
          const g = goalsById.get(obj.goal_id);
          if (g?.vision_id) effVision = g.vision_id;
        }
      }
    }
    if (goalId && effVision === null) {
      const g = goalsById.get(goalId);
      if (g?.vision_id) effVision = g.vision_id;
    }

    return { visionId: effVision, goalId: effGoal, objectiveId: effObjective, taskId: effTask };
  }, [selectionPath, goalsById, objectivesById, tasksById]);

  // Uses O(1) lookup maps. Rules: show selected item, its ancestors, its siblings, and its descendants only.
  const isInSelectedFamily = useCallback((type: 'vision' | 'goal' | 'objective' | 'task', id: string): boolean => {
    const { visionId, goalId, objectiveId, taskId } = effectivePath;
    if (!visionId && !goalId && !objectiveId && !taskId) return false;

    switch (type) {
      case 'vision': {
        // Only the effective vision (selected or ancestor of selected)
        return id === visionId;
      }
      case 'goal': {
        if (id === goalId) return true;
        const goal = goalsById.get(id);
        if (!goal) return false;
        // Vision selected: all goals under that vision. Goal/Objective/Task selected: that goal + siblings (same vision)
        return visionId !== null && goal.vision_id === visionId;
      }
      case 'objective': {
        if (id === objectiveId) return true;
        const obj = objectivesById.get(id);
        if (!obj) return false;
        // Task selected: only parent objective. Goal or Objective selected: all objectives under that goal
        if (goalId !== null && obj.goal_id === goalId) return true;
        // Vision only selected (no goal selected): all objectives under any goal of that vision
        if (visionId !== null && goalId === null && obj.goal_id) {
          const g = goalsById.get(obj.goal_id);
          if (g?.vision_id === visionId) return true;
        }
        return false;
      }
      case 'task': {
        if (id === taskId) return true;
        const task = tasksById.get(id);
        if (!task?.objective_id) return false;
        // Task selected: siblings (same objective). Objective selected: all tasks under that objective.
        if (objectiveId !== null && task.objective_id === objectiveId) return true;
        // Goal selected: all tasks under that goal (more specific - takes precedence)
        if (goalId !== null) {
          const obj = objectivesById.get(task.objective_id);
          if (obj?.goal_id === goalId) return true;
        }
        // Vision selected (but no goal selected): all tasks under that vision
        if (visionId !== null && goalId === null) {
          const obj = objectivesById.get(task.objective_id);
          if (obj?.goal_id) {
            const g = goalsById.get(obj.goal_id);
            if (g?.vision_id === visionId) return true;
          }
        }
        return false;
      }
      default:
        return false;
    }
  }, [effectivePath, goalsById, objectivesById, tasksById]);

  // ===== SELECTION ACTIONS =====
  const selectVision = useCallback((vision: Vision | null) => {
    // Toggle behavior: if same vision, deselect
    if (vision && selectionPath.visionId === vision.id) {
      setSelectionPath({ visionId: null, goalId: null, objectiveId: null, taskId: null });
    } else {
      setSelectionPath({
        visionId: vision?.id || null,
        goalId: null,
        objectiveId: null,
        taskId: null,
      });
    }
  }, [selectionPath.visionId]);

  const selectGoal = useCallback((goal: Goal | null) => {
    if (goal && selectionPath.goalId === goal.id) {
      setSelectionPath(prev => ({ ...prev, goalId: null, objectiveId: null, taskId: null }));
    } else {
      setSelectionPath({
        visionId: goal?.vision_id ?? null,
        goalId: goal?.id ?? null,
        objectiveId: null,
        taskId: null,
      });
    }
  }, [selectionPath.goalId]);

  const selectObjective = useCallback((objective: Objective | null) => {
    if (objective && selectionPath.objectiveId === objective.id) {
      setSelectionPath(prev => ({ ...prev, objectiveId: null, taskId: null }));
    } else {
      const parentGoal = objective?.goal_id ? goalsById.get(objective.goal_id) : null;
      setSelectionPath({
        visionId: parentGoal?.vision_id ?? null,
        goalId: objective?.goal_id ?? null,
        objectiveId: objective?.id ?? null,
        taskId: null,
      });
    }
  }, [selectionPath.objectiveId, goalsById]);

  const selectTask = useCallback((task: Task | null) => {
    if (task && selectionPath.taskId === task.id) {
      setSelectionPath(prev => ({ ...prev, taskId: null }));
    } else {
      const obj = task?.objective_id ? objectivesById.get(task.objective_id) : null;
      const parentGoal = obj?.goal_id ? goalsById.get(obj.goal_id) : null;
      setSelectionPath({
        visionId: parentGoal?.vision_id ?? null,
        goalId: obj?.goal_id ?? null,
        objectiveId: task?.objective_id ?? null,
        taskId: task?.id ?? null,
      });
    }
  }, [selectionPath.taskId, objectivesById, goalsById]);

  const clearSelection = useCallback(() => {
    setSelectionPath({ visionId: null, goalId: null, objectiveId: null, taskId: null });
  }, []);

  // ===== CRUD OPERATIONS =====
  const createVision = useCallback(async (title: string, description: string, targetDate: string): Promise<Vision | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('visions')
      .insert({
        user_id: userId,
        title,
        description,
        target_date: targetDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vision:', error);
      return null;
    }
    await loadVisions();
    return data;
  }, [userId, loadVisions]);

  const updateVision = useCallback(async (id: string, updates: Partial<Vision>): Promise<boolean> => {
    // Optimistic update: apply changes immediately
    const previousVisions = visions;
    setVisions(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    
    const { error } = await supabase.from('visions').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating vision:', error);
      // Rollback on error
      setVisions(previousVisions);
      return false;
    }
    return true;
  }, [visions]);

  const getVisionDescendantCounts = useCallback(async (id: string): Promise<{ goals: number; objectives: number; tasks: number }> => {
    if (!userId) return { goals: 0, objectives: 0, tasks: 0 };
    
    // Count goals
    const { count: goalsCount } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('vision_id', id)
      .eq('user_id', userId);
    
    // Count objectives under those goals
    const { data: goalIds } = await supabase
      .from('goals')
      .select('id')
      .eq('vision_id', id)
      .eq('user_id', userId);
    
    let objectivesCount = 0;
    let tasksCount = 0;
    
    if (goalIds && goalIds.length > 0) {
      const goalIdList = goalIds.map(g => g.id);
      
      // Count objectives
      const { count: objCount } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .in('goal_id', goalIdList)
        .eq('user_id', userId);
      objectivesCount = objCount || 0;
      
      // Count tasks under those objectives
      const { data: objectiveIds } = await supabase
        .from('objectives')
        .select('id')
        .in('goal_id', goalIdList)
        .eq('user_id', userId);
      
      if (objectiveIds && objectiveIds.length > 0) {
        const objectiveIdList = objectiveIds.map(o => o.id);
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('objective_id', objectiveIdList)
          .eq('user_id', userId);
        tasksCount = taskCount || 0;
      }
    }
    
    return {
      goals: goalsCount || 0,
      objectives: objectivesCount,
      tasks: tasksCount,
    };
  }, [userId]);

  const deleteVision = useCallback(async (id: string, orphanDescendants: boolean = false): Promise<boolean> => {
    // Store previous state for rollback
    const previousVisions = visions;
    const previousGoals = goals;
    
    // Optimistic update: remove vision immediately
    setVisions(prev => prev.filter(v => v.id !== id));
    
    if (orphanDescendants) {
      // Optimistically orphan goals
      setGoals(prev => prev.map(g => g.vision_id === id ? { ...g, vision_id: null } : g));
      
      const { error: orphanError } = await supabase
        .from('goals')
        .update({ vision_id: null })
        .eq('vision_id', id)
        .eq('user_id', userId!);
      
      if (orphanError) {
        console.error('Error orphaning goals:', orphanError);
        // Rollback
        setVisions(previousVisions);
        setGoals(previousGoals);
        return false;
      }
    }
    
    const { error } = await supabase.from('visions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting vision:', error);
      // Rollback
      setVisions(previousVisions);
      setGoals(previousGoals);
      return false;
    }
    
    if (selectionPath.visionId === id) {
      clearSelection();
    }
    return true;
  }, [userId, visions, goals, selectionPath.visionId, clearSelection]);

  const updateVisionOrder = useCallback(async (visionId: string, newOrder: number): Promise<void> => {
    await supabase.from('visions').update({ order: newOrder }).eq('id', visionId);
    await loadVisions();
  }, [loadVisions]);

  const createGoal = useCallback(async (title: string, description: string, targetDate: string, visionId: string | null): Promise<Goal | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title,
        description,
        target_date: targetDate || null,
        vision_id: visionId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return null;
    }
    await loadGoals();
    return data;
  }, [userId, loadGoals]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>): Promise<boolean> => {
    // Optimistic update: apply changes immediately
    const previousGoals = goals;
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    
    const { error } = await supabase.from('goals').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating goal:', error);
      // Rollback on error
      setGoals(previousGoals);
      return false;
    }
    return true;
  }, [goals]);

  const getGoalDescendantCounts = useCallback(async (id: string): Promise<{ objectives: number; tasks: number }> => {
    if (!userId) return { objectives: 0, tasks: 0 };
    
    // Count objectives
    const { count: objectivesCount } = await supabase
      .from('objectives')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', id)
      .eq('user_id', userId);
    
    // Count tasks under those objectives
    const { data: objectiveIds } = await supabase
      .from('objectives')
      .select('id')
      .eq('goal_id', id)
      .eq('user_id', userId);
    
    let tasksCount = 0;
    if (objectiveIds && objectiveIds.length > 0) {
      const objectiveIdList = objectiveIds.map(o => o.id);
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('objective_id', objectiveIdList)
        .eq('user_id', userId);
      tasksCount = taskCount || 0;
    }
    
    return {
      objectives: objectivesCount || 0,
      tasks: tasksCount,
    };
  }, [userId]);

  const deleteGoal = useCallback(async (id: string, orphanDescendants: boolean = false): Promise<boolean> => {
    // Store previous state for rollback
    const previousGoals = goals;
    const previousObjectives = objectives;
    
    // Optimistic update: remove goal immediately
    setGoals(prev => prev.filter(g => g.id !== id));
    
    if (orphanDescendants) {
      // Optimistically orphan objectives
      setObjectives(prev => prev.map(o => o.goal_id === id ? { ...o, goal_id: null } : o));
      
      const { error: orphanError } = await supabase
        .from('objectives')
        .update({ goal_id: null })
        .eq('goal_id', id)
        .eq('user_id', userId!);
      
      if (orphanError) {
        console.error('Error orphaning objectives:', orphanError);
        // Rollback
        setGoals(previousGoals);
        setObjectives(previousObjectives);
        return false;
      }
    }
    
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      console.error('Error deleting goal:', error);
      // Rollback
      setGoals(previousGoals);
      setObjectives(previousObjectives);
      return false;
    }
    
    if (selectionPath.goalId === id) {
      setSelectionPath(prev => ({ ...prev, goalId: null, objectiveId: null, taskId: null }));
    }
    return true;
  }, [userId, goals, objectives, selectionPath.goalId]);

  const createObjective = useCallback(async (title: string, description: string, priority: string, goalId: string | null, targetDate: string): Promise<Objective | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('objectives')
      .insert({
        goal_id: goalId,
        user_id: userId,
        title,
        description,
        priority: priority as 'high' | 'medium' | 'low',
        target_date: targetDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating objective:', error);
      return null;
    }
    await loadObjectives();
    return data;
  }, [userId, loadObjectives]);

  const updateObjective = useCallback(async (id: string, updates: Partial<Objective>): Promise<boolean> => {
    // Optimistic update: apply changes immediately
    const previousObjectives = objectives;
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    
    const { error } = await supabase.from('objectives').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating objective:', error);
      // Rollback on error
      setObjectives(previousObjectives);
      return false;
    }
    return true;
  }, [objectives]);

  const getObjectiveDescendantCounts = useCallback(async (id: string): Promise<{ tasks: number }> => {
    if (!userId) return { tasks: 0 };
    
    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('objective_id', id)
      .eq('user_id', userId);
    
    return {
      tasks: tasksCount || 0,
    };
  }, [userId]);

  const deleteObjective = useCallback(async (id: string, orphanDescendants: boolean = false): Promise<boolean> => {
    // Store previous state for rollback
    const previousObjectives = objectives;
    const previousTasks = tasks;
    
    // Optimistic update: remove objective immediately
    setObjectives(prev => prev.filter(o => o.id !== id));
    
    // Also remove from task counts
    setTaskCounts(prev => {
      const counts = { ...prev };
      delete counts[id];
      return counts;
    });
    
    if (orphanDescendants) {
      // Optimistically orphan tasks
      setTasks(prev => prev.map(t => t.objective_id === id ? { ...t, objective_id: null } : t));
      
      const { error: orphanError } = await supabase
        .from('tasks')
        .update({ objective_id: null })
        .eq('objective_id', id)
        .eq('user_id', userId!);
      
      if (orphanError) {
        console.error('Error orphaning tasks:', orphanError);
        // Rollback
        setObjectives(previousObjectives);
        setTasks(previousTasks);
        return false;
      }
    }
    
    const { error } = await supabase.from('objectives').delete().eq('id', id);
    if (error) {
      console.error('Error deleting objective:', error);
      // Rollback
      setObjectives(previousObjectives);
      setTasks(previousTasks);
      return false;
    }
    
    if (selectionPath.objectiveId === id) {
      setSelectionPath(prev => ({ ...prev, objectiveId: null, taskId: null }));
    }
    return true;
  }, [userId, objectives, tasks, selectionPath.objectiveId]);

  const createTask = useCallback(async (title: string, description: string, priority: string, dueDate: string, objectiveId: string | null, isRecurring: boolean): Promise<Task | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        objective_id: objectiveId,
        user_id: userId,
        title,
        description: description || '',
        priority: priority as 'high' | 'medium' | 'low',
        due_date: isRecurring ? null : (dueDate || null),
        is_recurring: isRecurring,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }
    await loadTasks();
    await loadTaskCounts();
    return data;
  }, [userId, loadTasks, loadTaskCounts]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<boolean> => {
    // Optimistic update: apply changes immediately
    const previousTasks = tasks;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    
    // Optimistically update task counts if status changed
    if (updates.status !== undefined) {
      const task = tasks.find(t => t.id === id);
      if (task?.objective_id) {
        setTaskCounts(prev => {
          const counts = { ...prev };
          const objId = task.objective_id!;
          if (counts[objId]) {
            const wasCompleted = task.status === 'completed';
            const isCompleted = updates.status === 'completed';
            if (wasCompleted && !isCompleted) {
              counts[objId] = { ...counts[objId], completed: counts[objId].completed - 1 };
            } else if (!wasCompleted && isCompleted) {
              counts[objId] = { ...counts[objId], completed: counts[objId].completed + 1 };
            }
          }
          return counts;
        });
      }
    }
    
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating task:', error);
      // Rollback on error
      setTasks(previousTasks);
      await loadTaskCounts(); // Reload counts on error
      return false;
    }
    return true;
  }, [tasks, loadTaskCounts]);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    // Store previous state for rollback
    const previousTasks = tasks;
    const previousTaskCounts = taskCounts;
    const taskToDelete = tasks.find(t => t.id === id);
    
    // Optimistic update: remove task immediately
    setTasks(prev => prev.filter(t => t.id !== id));
    
    // Update task counts optimistically
    if (taskToDelete?.objective_id) {
      setTaskCounts(prev => {
        const counts = { ...prev };
        const objId = taskToDelete.objective_id!;
        if (counts[objId]) {
          counts[objId] = {
            total: counts[objId].total - 1,
            completed: taskToDelete.status === 'completed' 
              ? counts[objId].completed - 1 
              : counts[objId].completed,
          };
        }
        return counts;
      });
    }
    
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      // Rollback
      setTasks(previousTasks);
      setTaskCounts(previousTaskCounts);
      return false;
    }
    
    if (selectionPath.taskId === id) {
      setSelectionPath(prev => ({ ...prev, taskId: null }));
    }
    return true;
  }, [tasks, taskCounts, selectionPath.taskId]);

  const toggleTaskStatus = useCallback(async (task: Task): Promise<void> => {
    if (task.is_recurring) {
      await markRecurringTaskCompletedToday(task.id);
      return;
    }
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
    await updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  }, [updateTask]);

  const toggleObjectiveStatus = useCallback(async (objective: Objective): Promise<void> => {
    const newStatus = objective.status === 'completed' ? 'not_started' : 'completed';
    await updateObjective(objective.id, { status: newStatus });
  }, [updateObjective]);

  const toggleGoalStatus = useCallback(async (goal: Goal): Promise<void> => {
    const newStatus = goal.status === 'completed' ? 'not_started' : 'completed';
    await updateGoal(goal.id, { status: newStatus });
  }, [updateGoal]);

  const markRecurringTaskCompletedToday = useCallback(async (taskId: string): Promise<void> => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('task_completions')
      .select('id')
      .eq('task_id', taskId)
      .eq('completion_date', today)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('task_completions').delete().eq('id', existing.id);
    } else {
      await supabase.from('task_completions').insert({
        task_id: taskId,
        user_id: userId,
        completion_date: today,
      });
    }
    await loadTasks();
  }, [userId, loadTasks]);

  // ===== CONVERSION OPERATIONS =====
  
  const convertVisionToGoal = useCallback(async (vision: Vision, targetVisionId: string | null): Promise<Goal | null> => {
    if (!userId) return null;
    
    // Create new goal from vision
    const { data: newGoal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: vision.title,
        description: vision.description,
        status: vision.status,
        target_date: vision.target_date,
        vision_id: targetVisionId,
      })
      .select()
      .single();
    
    if (goalError || !newGoal) {
      console.error('Error converting vision to goal:', goalError);
      return null;
    }
    
    // Update all goals that belonged to this vision to belong to the new goal's parent vision
    const { data: childGoals } = await supabase
      .from('goals')
      .select('id')
      .eq('vision_id', vision.id);
    
    if (childGoals && childGoals.length > 0) {
      // Convert child goals to objectives under the new goal
      for (const childGoal of childGoals) {
        const { data: goalData } = await supabase
          .from('goals')
          .select('*')
          .eq('id', childGoal.id)
          .single();
        
        if (goalData) {
          await supabase
            .from('objectives')
            .insert({
              user_id: userId,
              title: goalData.title,
              description: goalData.description,
              status: goalData.status,
              target_date: goalData.target_date,
              priority: 'medium',
              goal_id: newGoal.id,
            });
        }
      }
    }
    
    // Delete the original vision
    await supabase.from('visions').delete().eq('id', vision.id);
    
    // Reload data
    await Promise.all([loadVisions(), loadGoals(), loadObjectives()]);
    
    return newGoal;
  }, [userId, loadVisions, loadGoals, loadObjectives]);
  
  const convertGoalToVision = useCallback(async (goal: Goal): Promise<Vision | null> => {
    if (!userId) return null;
    
    // Create new vision from goal
    const { data: newVision, error: visionError } = await supabase
      .from('visions')
      .insert({
        user_id: userId,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        target_date: goal.target_date,
      })
      .select()
      .single();
    
    if (visionError || !newVision) {
      console.error('Error converting goal to vision:', visionError);
      return null;
    }
    
    // Update all objectives that belonged to this goal to become goals under the new vision
    const { data: childObjectives } = await supabase
      .from('objectives')
      .select('*')
      .eq('goal_id', goal.id);
    
    if (childObjectives && childObjectives.length > 0) {
      for (const obj of childObjectives) {
        await supabase
          .from('goals')
          .insert({
            user_id: userId,
            title: obj.title,
            description: obj.description,
            status: obj.status,
            target_date: obj.target_date,
            vision_id: newVision.id,
          });
      }
    }
    
    // Delete the original goal
    await supabase.from('goals').delete().eq('id', goal.id);
    
    // Reload data
    await Promise.all([loadVisions(), loadGoals(), loadObjectives()]);
    
    return newVision;
  }, [userId, loadVisions, loadGoals, loadObjectives]);
  
  const convertGoalToObjective = useCallback(async (goal: Goal, targetGoalId: string | null): Promise<Objective | null> => {
    if (!userId) return null;
    
    // Create new objective from goal
    const { data: newObjective, error: objError } = await supabase
      .from('objectives')
      .insert({
        user_id: userId,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        target_date: goal.target_date,
        priority: 'medium',
        goal_id: targetGoalId,
      })
      .select()
      .single();
    
    if (objError || !newObjective) {
      console.error('Error converting goal to objective:', objError);
      return null;
    }
    
    // Convert child objectives to tasks under the new objective
    const { data: childObjectives } = await supabase
      .from('objectives')
      .select('*')
      .eq('goal_id', goal.id);
    
    if (childObjectives && childObjectives.length > 0) {
      for (const obj of childObjectives) {
        await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title: obj.title,
            description: obj.description,
            status: obj.status,
            due_date: obj.target_date,
            priority: obj.priority,
            objective_id: newObjective.id,
          });
      }
    }
    
    // Delete the original goal
    await supabase.from('goals').delete().eq('id', goal.id);
    
    // Reload data
    await Promise.all([loadGoals(), loadObjectives(), loadTasks()]);
    
    return newObjective;
  }, [userId, loadGoals, loadObjectives, loadTasks]);
  
  const convertObjectiveToGoal = useCallback(async (objective: Objective, targetVisionId: string | null): Promise<Goal | null> => {
    if (!userId) return null;
    
    // Create new goal from objective
    const { data: newGoal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: objective.title,
        description: objective.description,
        status: objective.status,
        target_date: objective.target_date,
        vision_id: targetVisionId,
      })
      .select()
      .single();
    
    if (goalError || !newGoal) {
      console.error('Error converting objective to goal:', goalError);
      return null;
    }
    
    // Convert child tasks to objectives under the new goal
    const { data: childTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('objective_id', objective.id);
    
    if (childTasks && childTasks.length > 0) {
      for (const task of childTasks) {
        await supabase
          .from('objectives')
          .insert({
            user_id: userId,
            title: task.title,
            description: task.description || '',
            status: task.status,
            target_date: task.due_date,
            priority: task.priority,
            goal_id: newGoal.id,
          });
      }
    }
    
    // Delete the original objective
    await supabase.from('objectives').delete().eq('id', objective.id);
    
    // Reload data
    await Promise.all([loadGoals(), loadObjectives(), loadTasks()]);
    
    return newGoal;
  }, [userId, loadGoals, loadObjectives, loadTasks]);
  
  const convertObjectiveToTask = useCallback(async (objective: Objective, targetObjectiveId: string | null): Promise<Task | null> => {
    if (!userId) return null;
    
    // Create new task from objective
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: objective.title,
        description: objective.description,
        status: objective.status,
        due_date: objective.target_date,
        priority: objective.priority,
        objective_id: targetObjectiveId,
      })
      .select()
      .single();
    
    if (taskError || !newTask) {
      console.error('Error converting objective to task:', taskError);
      return null;
    }
    
    // Delete child tasks (or orphan them)
    await supabase
      .from('tasks')
      .update({ objective_id: null })
      .eq('objective_id', objective.id);
    
    // Delete the original objective
    await supabase.from('objectives').delete().eq('id', objective.id);
    
    // Reload data
    await Promise.all([loadObjectives(), loadTasks()]);
    
    return newTask;
  }, [userId, loadObjectives, loadTasks]);
  
  const convertTaskToObjective = useCallback(async (task: Task, targetGoalId: string | null): Promise<Objective | null> => {
    if (!userId) return null;
    
    // Create new objective from task
    const { data: newObjective, error: objError } = await supabase
      .from('objectives')
      .insert({
        user_id: userId,
        title: task.title,
        description: task.description || '',
        status: task.status,
        target_date: task.due_date,
        priority: task.priority,
        goal_id: targetGoalId,
      })
      .select()
      .single();
    
    if (objError || !newObjective) {
      console.error('Error converting task to objective:', objError);
      return null;
    }
    
    // Delete the original task
    await supabase.from('tasks').delete().eq('id', task.id);
    
    // Reload data
    await Promise.all([loadObjectives(), loadTasks()]);
    
    return newObjective;
  }, [userId, loadObjectives, loadTasks]);

  return {
    // Raw data
    visions,
    goals,
    objectives,
    tasks,
    
    // Selected items
    selectedVision,
    selectedGoal,
    selectedObjective,
    selectedTask,
    
    // Selection path
    selectionPath,
    
    // Loading
    loading,
    
    // Task counts
    taskCounts,
    
    // Visibility helpers
    getVisibleGoals,
    getVisibleObjectives,
    getVisibleTasks,
    
    // Orphan lists
    orphanedGoals,
    orphanedObjectives,
    orphanedTasks,
    
    // Family tree helper
    isInSelectedFamily,
    
    // Selection actions
    selectVision,
    selectGoal,
    selectObjective,
    selectTask,
    clearSelection,
    
    // CRUD operations
    createVision,
    updateVision,
    deleteVision,
    updateVisionOrder,
    getVisionDescendantCounts,
    
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalDescendantCounts,
    toggleGoalStatus,
    
    createObjective,
    updateObjective,
    deleteObjective,
    getObjectiveDescendantCounts,
    toggleObjectiveStatus,
    
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    markRecurringTaskCompletedToday,
    
    // Conversion operations
    convertVisionToGoal,
    convertGoalToVision,
    convertGoalToObjective,
    convertObjectiveToGoal,
    convertObjectiveToTask,
    convertTaskToObjective,
    
    // Reload functions
    reloadAll,
    reloadVisions: loadVisions,
    reloadGoals: loadGoals,
    reloadObjectives: loadObjectives,
    reloadTasks: loadTasks,
  };
}

