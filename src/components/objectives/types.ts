// Shared types for Objectives components

export interface Vision {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  target_date: string | null;
  order: number;
  last_edited_at: string;
}

export interface Goal {
  id: string;
  vision_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  target_date: string | null;
  last_edited_at: string;
}

export interface Objective {
  id: string;
  goal_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  target_date: string | null;
  last_edited_at: string;
}

export interface Task {
  id: string;
  objective_id: string | null;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  completed_at: string | null;
  notes: string;
  last_edited_at: string;
  is_recurring: boolean;
}

export interface TaskCount {
  objective_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
}

export type Status = 'not_started' | 'in_progress' | 'completed' | 'on_hold';
export type Priority = 'high' | 'medium' | 'low';
export type ItemType = 'vision' | 'goal' | 'objective' | 'task';

