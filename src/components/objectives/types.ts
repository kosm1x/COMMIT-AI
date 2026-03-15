// Shared types for Objectives components
// Aligned with auto-generated database.types.ts (nullable fields match DB schema)

export interface Vision {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  target_date: string | null;
  order: number | null;
  last_edited_at: string;
}

export interface Goal {
  id: string;
  vision_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  target_date: string | null;
  last_edited_at: string;
}

export interface Objective {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  target_date: string | null;
  last_edited_at: string;
}

export interface Task {
  id: string;
  objective_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document_links: any;
  last_edited_at: string;
  is_recurring: boolean;
}

export interface TaskCount {
  objective_id: string | null;
  status: string | null;
}

export type Status = "not_started" | "in_progress" | "completed" | "on_hold";
export type Priority = "high" | "medium" | "low";
export type ItemType = "vision" | "goal" | "objective" | "task";
