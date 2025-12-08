import { supabase } from '../lib/supabase';
import { Vision, Goal, Objective, Task, TaskCount } from '../components/objectives/types';
import { sanitizeInput } from '../components/objectives/utils';

export class ObjectivesService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Vision operations
  async loadVisions(): Promise<Vision[]> {
    const { data, error } = await supabase
      .from('visions')
      .select('*')
      .eq('user_id', this.userId)
      .order('order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading visions:', error);
      return [];
    }
    return data || [];
  }

  async createVision(title: string, description: string, targetDate: string): Promise<Vision | null> {
    const { data, error } = await supabase
      .from('visions')
      .insert({
        user_id: this.userId,
        title: sanitizeInput(title),
        description: sanitizeInput(description),
        target_date: targetDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vision:', error);
      return null;
    }
    return data;
  }

  async updateVision(id: string, updates: Partial<Vision>): Promise<boolean> {
    const sanitizedUpdates: Partial<Vision> = { ...updates };
    if (updates.title) sanitizedUpdates.title = sanitizeInput(updates.title);
    if (updates.description) sanitizedUpdates.description = sanitizeInput(updates.description);

    const { error } = await supabase
      .from('visions')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error updating vision:', error);
      return false;
    }
    return true;
  }

  async updateVisionOrder(visionId: string, newOrder: number): Promise<boolean> {
    const { error } = await supabase
      .from('visions')
      .update({ order: newOrder })
      .eq('id', visionId)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error updating vision order:', error);
      return false;
    }
    return true;
  }

  async deleteVision(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('visions')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error deleting vision:', error);
      return false;
    }
    return true;
  }

  // Goal operations
  async loadGoals(visionId?: string): Promise<Goal[]> {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', this.userId);

    if (visionId) {
      query = query.eq('vision_id', visionId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading goals:', error);
      return [];
    }
    return data || [];
  }

  async loadOrphanedGoals(): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .is('vision_id', null)
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading orphaned goals:', error);
      return [];
    }
    return data || [];
  }

  async createGoal(title: string, description: string, targetDate: string, visionId: string | null): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: this.userId,
        title: sanitizeInput(title),
        description: sanitizeInput(description),
        target_date: targetDate || null,
        vision_id: visionId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return null;
    }
    return data;
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<boolean> {
    const sanitizedUpdates: Partial<Goal> = { ...updates };
    if (updates.title) sanitizedUpdates.title = sanitizeInput(updates.title);
    if (updates.description) sanitizedUpdates.description = sanitizeInput(updates.description);

    const { error } = await supabase
      .from('goals')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error updating goal:', error);
      return false;
    }
    return true;
  }

  async deleteGoal(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
    return true;
  }

  // Objective operations
  async loadObjectives(goalId?: string): Promise<Objective[]> {
    let query = supabase
      .from('objectives')
      .select('*')
      .eq('user_id', this.userId);

    if (goalId) {
      query = query.eq('goal_id', goalId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading objectives:', error);
      return [];
    }
    return data || [];
  }

  async loadOrphanedObjectives(): Promise<Objective[]> {
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .is('goal_id', null)
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading orphaned objectives:', error);
      return [];
    }
    return data || [];
  }

  async createObjective(
    title: string,
    description: string,
    priority: string,
    goalId: string | null,
    targetDate: string
  ): Promise<Objective | null> {
    const { data, error } = await supabase
      .from('objectives')
      .insert({
        goal_id: goalId,
        user_id: this.userId,
        title: sanitizeInput(title),
        description: sanitizeInput(description),
        priority: priority as 'high' | 'medium' | 'low',
        target_date: targetDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating objective:', error);
      return null;
    }
    return data;
  }

  async updateObjective(id: string, updates: Partial<Objective>): Promise<boolean> {
    const sanitizedUpdates: Partial<Objective> = { ...updates };
    if (updates.title) sanitizedUpdates.title = sanitizeInput(updates.title);
    if (updates.description) sanitizedUpdates.description = sanitizeInput(updates.description);

    const { error } = await supabase
      .from('objectives')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error updating objective:', error);
      return false;
    }
    return true;
  }

  async deleteObjective(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('objectives')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error deleting objective:', error);
      return false;
    }
    return true;
  }

  // Task operations
  async loadTasks(objectiveId?: string): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId);

    if (objectiveId) {
      query = query.eq('objective_id', objectiveId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
    return data || [];
  }

  async loadOrphanedTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .is('objective_id', null)
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading orphaned tasks:', error);
      return [];
    }
    return data || [];
  }

  async loadTaskCounts(objectiveIds: string[]): Promise<Record<string, { total: number; completed: number }>> {
    if (objectiveIds.length === 0) return {};

    const { data, error } = await supabase
      .from('tasks')
      .select('objective_id, status')
      .in('objective_id', objectiveIds)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error loading task counts:', error);
      return {};
    }

    const counts: Record<string, { total: number; completed: number }> = {};
    (data || []).forEach((task: TaskCount) => {
      if (!counts[task.objective_id]) {
        counts[task.objective_id] = { total: 0, completed: 0 };
      }
      counts[task.objective_id].total++;
      if (task.status === 'completed') {
        counts[task.objective_id].completed++;
      }
    });

    return counts;
  }

  async createTask(
    title: string,
    priority: string,
    dueDate: string,
    objectiveId: string | null,
    isRecurring: boolean
  ): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        objective_id: objectiveId,
        user_id: this.userId,
        title: sanitizeInput(title),
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
    return data;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    const sanitizedUpdates: Partial<Task> = { ...updates };
    if (updates.title) sanitizedUpdates.title = sanitizeInput(updates.title);
    if (updates.description) sanitizedUpdates.description = sanitizeInput(updates.description);
    if (updates.notes) sanitizedUpdates.notes = sanitizeInput(updates.notes);

    const { error } = await supabase
      .from('tasks')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error updating task:', error);
      return false;
    }
    return true;
  }

  async deleteTask(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }
    return true;
  }

  async markRecurringTaskCompletedToday(taskId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    // Check if already completed today
    const { data: existing } = await supabase
      .from('task_completions')
      .select('id')
      .eq('task_id', taskId)
      .eq('completion_date', today)
      .eq('user_id', this.userId)
      .single();

    if (existing) {
      // Already completed today, remove the completion
      const { error } = await supabase
        .from('task_completions')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Error removing task completion:', error);
        return false;
      }
    } else {
      // Mark as completed today
      const { error } = await supabase
        .from('task_completions')
        .insert({
          task_id: taskId,
          user_id: this.userId,
          completion_date: today,
        });

      if (error) {
        console.error('Error marking task completed:', error);
        return false;
      }
    }

    return true;
  }

  // Fetch single items (for navigation state handling)
  async getVision(id: string): Promise<Vision | null> {
    const { data, error } = await supabase
      .from('visions')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();

    if (error) return null;
    return data;
  }

  async getGoal(id: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();

    if (error) return null;
    return data;
  }

  async getObjective(id: string): Promise<Objective | null> {
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();

    if (error) return null;
    return data;
  }

  async getTask(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();

    if (error) return null;
    return data;
  }
}

// Factory function for creating service instances
export function createObjectivesService(userId: string): ObjectivesService {
  return new ObjectivesService(userId);
}

