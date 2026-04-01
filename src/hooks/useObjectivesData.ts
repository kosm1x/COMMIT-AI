import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Vision, Goal, Objective, Task } from "../components/objectives/types";
import {
  hasSessionSorted,
  markSessionSorted,
  sortGoals,
  sortObjectives,
  sortTasks,
} from "../utils/autoSort";
import { logger } from '../utils/logger';

export interface ObjectivesDataState {
  visions: Vision[];
  goals: Goal[];
  objectives: Objective[];
  tasks: Task[];
  taskCounts: Record<string, { total: number; completed: number }>;
  loading: boolean;

  setVisions: React.Dispatch<React.SetStateAction<Vision[]>>;
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  setObjectives: React.Dispatch<React.SetStateAction<Objective[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setTaskCounts: React.Dispatch<
    React.SetStateAction<Record<string, { total: number; completed: number }>>
  >;

  reloadAll: () => Promise<void>;
  loadVisions: () => Promise<void>;
  loadGoals: () => Promise<void>;
  loadObjectives: () => Promise<void>;
  loadTasks: () => Promise<void>;
  loadTaskCounts: () => Promise<void>;
}

export function useObjectivesData(
  userId: string | undefined,
): ObjectivesDataState {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<
    Record<string, { total: number; completed: number }>
  >({});
  const [loading, setLoading] = useState(false);

  const loadVisions = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("visions")
      .select(
        'id, title, description, status, target_date, "order", last_edited_at',
      )
      .eq("user_id", userId)
      .order("order", { ascending: true })
      .order("created_at", { ascending: true });
    if (data) setVisions(data as Vision[]);
  }, [userId]);

  const loadGoals = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("goals")
      .select(
        "id, vision_id, title, description, status, target_date, last_edited_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (data) setGoals(data as Goal[]);
  }, [userId]);

  const loadObjectives = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("objectives")
      .select(
        "id, goal_id, title, description, status, priority, target_date, last_edited_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (data) setObjectives(data as Objective[]);
  }, [userId]);

  const loadTasks = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("tasks")
      .select(
        "id, objective_id, title, description, status, priority, due_date, completed_at, notes, document_links, last_edited_at, is_recurring",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (data) setTasks(data as Task[]);
  }, [userId]);

  const computedTaskCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number }> = {};
    tasks.forEach((task) => {
      if (task.objective_id) {
        if (!counts[task.objective_id]) {
          counts[task.objective_id] = { total: 0, completed: 0 };
        }
        counts[task.objective_id].total++;
        if (task.status === "completed") {
          counts[task.objective_id].completed++;
        }
      }
    });
    return counts;
  }, [tasks]);

  const loadTaskCounts = useCallback(async () => {
    setTaskCounts(computedTaskCounts);
  }, [computedTaskCounts]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadVisions(),
      loadGoals(),
      loadObjectives(),
      loadTasks(),
    ]);
    setLoading(false);
  }, [loadVisions, loadGoals, loadObjectives, loadTasks]);

  const hasAppliedSessionSort = useRef(false);

  // Initial load — prune stale completed tasks before fetching
  useEffect(() => {
    if (userId) {
      supabase
        .rpc("prune_completed_tasks" as never)
        .then(({ error }: { error: { message: string } | null }) => {
          if (error) logger.warn("Task pruning skipped:", error.message);
          reloadAll();
        });
    } else {
      setLoading(false);
    }
  }, [userId, reloadAll]);

  // One-time per session auto-sort after initial load
  useEffect(() => {
    if (
      !loading &&
      goals.length > 0 &&
      !hasAppliedSessionSort.current &&
      !hasSessionSorted()
    ) {
      hasAppliedSessionSort.current = true;
      markSessionSorted();
      setGoals((prev) => sortGoals(prev));
      setObjectives((prev) => sortObjectives(prev));
      setTasks((prev) => sortTasks(prev));
    }
  }, [loading, goals.length]);

  // Sync task counts when computed counts change
  useEffect(() => {
    setTaskCounts(computedTaskCounts);
  }, [computedTaskCounts]);

  return {
    visions,
    goals,
    objectives,
    tasks,
    taskCounts,
    loading,
    setVisions,
    setGoals,
    setObjectives,
    setTasks,
    setTaskCounts,
    reloadAll,
    loadVisions,
    loadGoals,
    loadObjectives,
    loadTasks,
    loadTaskCounts,
  };
}
