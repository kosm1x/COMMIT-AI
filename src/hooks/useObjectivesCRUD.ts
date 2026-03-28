import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Vision, Goal, Objective, Task } from "../components/objectives/types";
import type { ObjectivesDataState } from "./useObjectivesData";
import type { SelectionPath } from "./useObjectivesSelection";

interface SelectionDeps {
  selectionPath: SelectionPath;
  clearSelection: () => void;
  setSelectionPath: React.Dispatch<React.SetStateAction<SelectionPath>>;
}

export interface ObjectivesCRUDOps {
  createVision: (
    title: string,
    description: string,
    targetDate: string,
  ) => Promise<Vision | null>;
  updateVision: (id: string, updates: Partial<Vision>) => Promise<boolean>;
  deleteVision: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  updateVisionOrder: (visionId: string, newOrder: number) => Promise<void>;
  getVisionDescendantCounts: (
    id: string,
  ) => Promise<{ goals: number; objectives: number; tasks: number }>;

  createGoal: (
    title: string,
    description: string,
    targetDate: string,
    visionId: string | null,
  ) => Promise<Goal | null>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<boolean>;
  deleteGoal: (id: string, orphanDescendants?: boolean) => Promise<boolean>;
  getGoalDescendantCounts: (
    id: string,
  ) => Promise<{ objectives: number; tasks: number }>;
  toggleGoalStatus: (goal: Goal) => Promise<void>;

  createObjective: (
    title: string,
    description: string,
    priority: string,
    goalId: string | null,
    targetDate: string,
  ) => Promise<Objective | null>;
  updateObjective: (
    id: string,
    updates: Partial<Objective>,
  ) => Promise<boolean>;
  deleteObjective: (
    id: string,
    orphanDescendants?: boolean,
  ) => Promise<boolean>;
  getObjectiveDescendantCounts: (id: string) => Promise<{ tasks: number }>;
  toggleObjectiveStatus: (objective: Objective) => Promise<void>;

  createTask: (
    title: string,
    description: string,
    priority: string,
    dueDate: string,
    objectiveId: string | null,
    isRecurring: boolean,
  ) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskStatus: (task: Task) => Promise<void>;
  markRecurringTaskCompletedToday: (taskId: string) => Promise<void>;

  convertVisionToGoal: (
    vision: Vision,
    targetVisionId: string | null,
  ) => Promise<Goal | null>;
  convertGoalToVision: (goal: Goal) => Promise<Vision | null>;
  convertGoalToObjective: (
    goal: Goal,
    targetGoalId: string | null,
  ) => Promise<Objective | null>;
  convertObjectiveToGoal: (
    objective: Objective,
    targetVisionId: string | null,
  ) => Promise<Goal | null>;
  convertObjectiveToTask: (
    objective: Objective,
    targetObjectiveId: string | null,
  ) => Promise<Task | null>;
  convertTaskToObjective: (
    task: Task,
    targetGoalId: string | null,
  ) => Promise<Objective | null>;
}

export function useObjectivesCRUD(
  userId: string | undefined,
  data: ObjectivesDataState,
  selection: SelectionDeps,
  pushUndo?: (label: string, undoFn: () => Promise<boolean>) => void,
): ObjectivesCRUDOps {
  const {
    visions,
    goals,
    objectives,
    tasks,
    taskCounts,
    setVisions,
    setGoals,
    setObjectives,
    setTasks,
    setTaskCounts,
    loadVisions,
    loadGoals,
    loadObjectives,
    loadTasks,
    loadTaskCounts,
  } = data;
  const { selectionPath, clearSelection, setSelectionPath } = selection;

  // ===== VISION CRUD =====
  const createVision = useCallback(
    async (
      title: string,
      description: string,
      targetDate: string,
    ): Promise<Vision | null> => {
      if (!userId) return null;
      const { data: result, error } = await supabase
        .from("visions")
        .insert({
          user_id: userId,
          title,
          description,
          target_date: targetDate || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating vision:", error);
        return null;
      }
      await loadVisions();
      return result;
    },
    [userId, loadVisions],
  );

  const updateVision = useCallback(
    async (id: string, updates: Partial<Vision>): Promise<boolean> => {
      const previousVisions = visions;
      setVisions((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      );

      const { error } = await supabase
        .from("visions")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("Error updating vision:", error);
        setVisions(previousVisions);
        return false;
      }
      return true;
    },
    [visions, setVisions],
  );

  const getVisionDescendantCounts = useCallback(
    async (
      id: string,
    ): Promise<{ goals: number; objectives: number; tasks: number }> => {
      if (!userId) return { goals: 0, objectives: 0, tasks: 0 };

      const { count: goalsCount } = await supabase
        .from("goals")
        .select("*", { count: "exact", head: true })
        .eq("vision_id", id)
        .eq("user_id", userId);

      const { data: goalIds } = await supabase
        .from("goals")
        .select("id")
        .eq("vision_id", id)
        .eq("user_id", userId);

      let objectivesCount = 0;
      let tasksCount = 0;

      if (goalIds && goalIds.length > 0) {
        const goalIdList = goalIds.map((g) => g.id);

        const { count: objCount } = await supabase
          .from("objectives")
          .select("*", { count: "exact", head: true })
          .in("goal_id", goalIdList)
          .eq("user_id", userId);
        objectivesCount = objCount || 0;

        const { data: objectiveIds } = await supabase
          .from("objectives")
          .select("id")
          .in("goal_id", goalIdList)
          .eq("user_id", userId);

        if (objectiveIds && objectiveIds.length > 0) {
          const objectiveIdList = objectiveIds.map((o) => o.id);
          const { count: taskCount } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .in("objective_id", objectiveIdList)
            .eq("user_id", userId);
          tasksCount = taskCount || 0;
        }
      }

      return {
        goals: goalsCount || 0,
        objectives: objectivesCount,
        tasks: tasksCount,
      };
    },
    [userId],
  );

  const deleteVision = useCallback(
    async (
      id: string,
      orphanDescendants: boolean = false,
    ): Promise<boolean> => {
      const previousVisions = visions;
      const previousGoals = goals;

      setVisions((prev) => prev.filter((v) => v.id !== id));

      if (orphanDescendants) {
        setGoals((prev) =>
          prev.map((g) => (g.vision_id === id ? { ...g, vision_id: null } : g)),
        );

        const { error: orphanError } = await supabase
          .from("goals")
          .update({ vision_id: null })
          .eq("vision_id", id)
          .eq("user_id", userId!);

        if (orphanError) {
          console.error("Error orphaning goals:", orphanError);
          setVisions(previousVisions);
          setGoals(previousGoals);
          return false;
        }
      }

      const { error } = await supabase.from("visions").delete().eq("id", id);
      if (error) {
        console.error("Error deleting vision:", error);
        setVisions(previousVisions);
        setGoals(previousGoals);
        return false;
      }

      if (selectionPath.visionId === id) {
        clearSelection();
      }

      const deleted = previousVisions.find((v) => v.id === id);
      if (deleted && pushUndo) {
        pushUndo(`Deleted: ${deleted.title}`, async () => {
          const { error: reinsertErr } = await supabase
            .from("visions")
            .insert({
              user_id: userId!,
              title: deleted.title,
              description: deleted.description,
              target_date: deleted.target_date,
              status: deleted.status,
            })
            .select();
          if (reinsertErr) return false;
          await loadVisions();
          return true;
        });
      }
      return true;
    },
    [
      userId,
      visions,
      goals,
      selectionPath.visionId,
      clearSelection,
      setVisions,
      setGoals,
    ],
  );

  const updateVisionOrder = useCallback(
    async (visionId: string, newOrder: number): Promise<void> => {
      await supabase
        .from("visions")
        .update({ order: newOrder })
        .eq("id", visionId);
      await loadVisions();
    },
    [loadVisions],
  );

  // ===== GOAL CRUD =====
  const createGoal = useCallback(
    async (
      title: string,
      description: string,
      targetDate: string,
      visionId: string | null,
    ): Promise<Goal | null> => {
      if (!userId) return null;
      const { data: result, error } = await supabase
        .from("goals")
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
        console.error("Error creating goal:", error);
        return null;
      }
      await loadGoals();
      return result;
    },
    [userId, loadGoals],
  );

  const updateGoal = useCallback(
    async (id: string, updates: Partial<Goal>): Promise<boolean> => {
      const previousGoals = goals;
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      );

      const { error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("Error updating goal:", error);
        setGoals(previousGoals);
        return false;
      }
      return true;
    },
    [goals, setGoals],
  );

  const getGoalDescendantCounts = useCallback(
    async (id: string): Promise<{ objectives: number; tasks: number }> => {
      if (!userId) return { objectives: 0, tasks: 0 };

      const { count: objectivesCount } = await supabase
        .from("objectives")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", id)
        .eq("user_id", userId);

      const { data: objectiveIds } = await supabase
        .from("objectives")
        .select("id")
        .eq("goal_id", id)
        .eq("user_id", userId);

      let tasksCount = 0;
      if (objectiveIds && objectiveIds.length > 0) {
        const objectiveIdList = objectiveIds.map((o) => o.id);
        const { count: taskCount } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("objective_id", objectiveIdList)
          .eq("user_id", userId);
        tasksCount = taskCount || 0;
      }

      return {
        objectives: objectivesCount || 0,
        tasks: tasksCount,
      };
    },
    [userId],
  );

  const deleteGoal = useCallback(
    async (
      id: string,
      orphanDescendants: boolean = false,
    ): Promise<boolean> => {
      const previousGoals = goals;
      const previousObjectives = objectives;

      setGoals((prev) => prev.filter((g) => g.id !== id));

      if (orphanDescendants) {
        setObjectives((prev) =>
          prev.map((o) => (o.goal_id === id ? { ...o, goal_id: null } : o)),
        );

        const { error: orphanError } = await supabase
          .from("objectives")
          .update({ goal_id: null })
          .eq("goal_id", id)
          .eq("user_id", userId!);

        if (orphanError) {
          console.error("Error orphaning objectives:", orphanError);
          setGoals(previousGoals);
          setObjectives(previousObjectives);
          return false;
        }
      }

      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) {
        console.error("Error deleting goal:", error);
        setGoals(previousGoals);
        setObjectives(previousObjectives);
        return false;
      }

      if (selectionPath.goalId === id) {
        setSelectionPath((prev) => ({
          ...prev,
          goalId: null,
          objectiveId: null,
          taskId: null,
        }));
      }

      const deleted = previousGoals.find((g) => g.id === id);
      if (deleted && pushUndo) {
        pushUndo(`Deleted: ${deleted.title}`, async () => {
          const { error: reinsertErr } = await supabase
            .from("goals")
            .insert({
              user_id: userId!,
              title: deleted.title,
              description: deleted.description,
              vision_id: deleted.vision_id,
              target_date: deleted.target_date,
              status: deleted.status,
            })
            .select();
          if (reinsertErr) return false;
          await loadGoals();
          return true;
        });
      }
      return true;
    },
    [
      userId,
      goals,
      objectives,
      selectionPath.goalId,
      setGoals,
      setObjectives,
      setSelectionPath,
    ],
  );

  // ===== OBJECTIVE CRUD =====
  const createObjective = useCallback(
    async (
      title: string,
      description: string,
      priority: string,
      goalId: string | null,
      targetDate: string,
    ): Promise<Objective | null> => {
      if (!userId) return null;
      const { data: result, error } = await supabase
        .from("objectives")
        .insert({
          goal_id: goalId,
          user_id: userId,
          title,
          description,
          priority: priority as "high" | "medium" | "low",
          target_date: targetDate || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating objective:", error);
        return null;
      }
      await loadObjectives();
      return result;
    },
    [userId, loadObjectives],
  );

  const updateObjective = useCallback(
    async (id: string, updates: Partial<Objective>): Promise<boolean> => {
      const previousObjectives = objectives;
      setObjectives((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      );

      const { error } = await supabase
        .from("objectives")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("Error updating objective:", error);
        setObjectives(previousObjectives);
        return false;
      }
      return true;
    },
    [objectives, setObjectives],
  );

  const getObjectiveDescendantCounts = useCallback(
    async (id: string): Promise<{ tasks: number }> => {
      if (!userId) return { tasks: 0 };

      const { count: tasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("objective_id", id)
        .eq("user_id", userId);

      return {
        tasks: tasksCount || 0,
      };
    },
    [userId],
  );

  const deleteObjective = useCallback(
    async (
      id: string,
      orphanDescendants: boolean = false,
    ): Promise<boolean> => {
      const previousObjectives = objectives;
      const previousTasks = tasks;

      setObjectives((prev) => prev.filter((o) => o.id !== id));

      setTaskCounts((prev) => {
        const counts = { ...prev };
        delete counts[id];
        return counts;
      });

      if (orphanDescendants) {
        setTasks((prev) =>
          prev.map((t) =>
            t.objective_id === id ? { ...t, objective_id: null } : t,
          ),
        );

        const { error: orphanError } = await supabase
          .from("tasks")
          .update({ objective_id: null })
          .eq("objective_id", id)
          .eq("user_id", userId!);

        if (orphanError) {
          console.error("Error orphaning tasks:", orphanError);
          setObjectives(previousObjectives);
          setTasks(previousTasks);
          return false;
        }
      }

      const { error } = await supabase.from("objectives").delete().eq("id", id);
      if (error) {
        console.error("Error deleting objective:", error);
        setObjectives(previousObjectives);
        setTasks(previousTasks);
        return false;
      }

      if (selectionPath.objectiveId === id) {
        setSelectionPath((prev) => ({
          ...prev,
          objectiveId: null,
          taskId: null,
        }));
      }

      const deleted = previousObjectives.find((o) => o.id === id);
      if (deleted && pushUndo) {
        pushUndo(`Deleted: ${deleted.title}`, async () => {
          const { error: reinsertErr } = await supabase
            .from("objectives")
            .insert({
              user_id: userId!,
              title: deleted.title,
              description: deleted.description,
              goal_id: deleted.goal_id,
              priority: deleted.priority,
              target_date: deleted.target_date,
              status: deleted.status,
            })
            .select();
          if (reinsertErr) return false;
          await loadObjectives();
          await loadTaskCounts();
          return true;
        });
      }
      return true;
    },
    [
      userId,
      objectives,
      tasks,
      selectionPath.objectiveId,
      setObjectives,
      setTasks,
      setTaskCounts,
      setSelectionPath,
    ],
  );

  // ===== TASK CRUD =====
  const createTask = useCallback(
    async (
      title: string,
      description: string,
      priority: string,
      dueDate: string,
      objectiveId: string | null,
      isRecurring: boolean,
    ): Promise<Task | null> => {
      if (!userId) return null;
      const { data: result, error } = await supabase
        .from("tasks")
        .insert({
          objective_id: objectiveId,
          user_id: userId,
          title,
          description: description || "",
          priority: priority as "high" | "medium" | "low",
          due_date: isRecurring ? null : dueDate || null,
          is_recurring: isRecurring,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating task:", error);
        return null;
      }
      await loadTasks();
      await loadTaskCounts();
      return result;
    },
    [userId, loadTasks, loadTaskCounts],
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>): Promise<boolean> => {
      const previousTasks = tasks;
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );

      if (updates.status !== undefined) {
        const task = tasks.find((t) => t.id === id);
        if (task?.objective_id) {
          setTaskCounts((prev) => {
            const counts = { ...prev };
            const objId = task.objective_id!;
            if (counts[objId]) {
              const wasCompleted = task.status === "completed";
              const isCompleted = updates.status === "completed";
              if (wasCompleted && !isCompleted) {
                counts[objId] = {
                  ...counts[objId],
                  completed: counts[objId].completed - 1,
                };
              } else if (!wasCompleted && isCompleted) {
                counts[objId] = {
                  ...counts[objId],
                  completed: counts[objId].completed + 1,
                };
              }
            }
            return counts;
          });
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("Error updating task:", error);
        setTasks(previousTasks);
        await loadTaskCounts();
        return false;
      }
      return true;
    },
    [tasks, setTasks, setTaskCounts, loadTaskCounts],
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      const previousTasks = tasks;
      const previousTaskCounts = taskCounts;
      const taskToDelete = tasks.find((t) => t.id === id);

      setTasks((prev) => prev.filter((t) => t.id !== id));

      if (taskToDelete?.objective_id) {
        setTaskCounts((prev) => {
          const counts = { ...prev };
          const objId = taskToDelete.objective_id!;
          if (counts[objId]) {
            counts[objId] = {
              total: counts[objId].total - 1,
              completed:
                taskToDelete.status === "completed"
                  ? counts[objId].completed - 1
                  : counts[objId].completed,
            };
          }
          return counts;
        });
      }

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        console.error("Error deleting task:", error);
        setTasks(previousTasks);
        setTaskCounts(previousTaskCounts);
        return false;
      }

      if (selectionPath.taskId === id) {
        setSelectionPath((prev) => ({ ...prev, taskId: null }));
      }

      if (taskToDelete && pushUndo) {
        pushUndo(`Deleted: ${taskToDelete.title}`, async () => {
          const { error: reinsertErr } = await supabase
            .from("tasks")
            .insert({
              user_id: userId!,
              title: taskToDelete.title,
              description: taskToDelete.description,
              objective_id: taskToDelete.objective_id,
              priority: taskToDelete.priority,
              due_date: taskToDelete.due_date,
              status: taskToDelete.status,
              is_recurring: taskToDelete.is_recurring,
              notes: taskToDelete.notes,
            })
            .select();
          if (reinsertErr) return false;
          await loadTasks();
          await loadTaskCounts();
          return true;
        });
      }
      return true;
    },
    [
      tasks,
      taskCounts,
      selectionPath.taskId,
      setTasks,
      setTaskCounts,
      setSelectionPath,
    ],
  );

  // ===== TOGGLE STATUS =====
  const markRecurringTaskCompletedToday = useCallback(
    async (taskId: string): Promise<void> => {
      if (!userId) return;
      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("task_completions")
        .select("id")
        .eq("task_id", taskId)
        .eq("completion_date", today)
        .eq("user_id", userId)
        .single();

      if (existing) {
        await supabase.from("task_completions").delete().eq("id", existing.id);
      } else {
        await supabase.from("task_completions").insert({
          task_id: taskId,
          user_id: userId,
          completion_date: today,
        });
      }
      await loadTasks();
    },
    [userId, loadTasks],
  );

  const toggleTaskStatus = useCallback(
    async (task: Task): Promise<void> => {
      if (task.is_recurring) {
        await markRecurringTaskCompletedToday(task.id);
        return;
      }
      const newStatus =
        task.status === "completed" ? "not_started" : "completed";
      await updateTask(task.id, {
        status: newStatus,
        completed_at:
          newStatus === "completed" ? new Date().toISOString() : null,
      });
    },
    [updateTask, markRecurringTaskCompletedToday],
  );

  const toggleObjectiveStatus = useCallback(
    async (objective: Objective): Promise<void> => {
      const newStatus =
        objective.status === "completed" ? "not_started" : "completed";
      await updateObjective(objective.id, { status: newStatus });
    },
    [updateObjective],
  );

  const toggleGoalStatus = useCallback(
    async (goal: Goal): Promise<void> => {
      const newStatus =
        goal.status === "completed" ? "not_started" : "completed";
      await updateGoal(goal.id, { status: newStatus });
    },
    [updateGoal],
  );

  // ===== CONVERSION OPERATIONS =====
  const convertVisionToGoal = useCallback(
    async (
      vision: Vision,
      targetVisionId: string | null,
    ): Promise<Goal | null> => {
      if (!userId) return null;

      const { data: newGoal, error: goalError } = await supabase
        .from("goals")
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
        console.error("Error converting vision to goal:", goalError);
        return null;
      }

      const { data: childGoals } = await supabase
        .from("goals")
        .select("id")
        .eq("vision_id", vision.id);

      if (childGoals && childGoals.length > 0) {
        for (const childGoal of childGoals) {
          const { data: goalData } = await supabase
            .from("goals")
            .select("*")
            .eq("id", childGoal.id)
            .single();

          if (goalData) {
            await supabase.from("objectives").insert({
              user_id: userId,
              title: goalData.title,
              description: goalData.description,
              status: goalData.status,
              target_date: goalData.target_date,
              priority: "medium",
              goal_id: newGoal.id,
            });
          }
        }
      }

      await supabase.from("visions").delete().eq("id", vision.id);
      await Promise.all([loadVisions(), loadGoals(), loadObjectives()]);

      return newGoal;
    },
    [userId, loadVisions, loadGoals, loadObjectives],
  );

  const convertGoalToVision = useCallback(
    async (goal: Goal): Promise<Vision | null> => {
      if (!userId) return null;

      const { data: newVision, error: visionError } = await supabase
        .from("visions")
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
        console.error("Error converting goal to vision:", visionError);
        return null;
      }

      const { data: childObjectives } = await supabase
        .from("objectives")
        .select("*")
        .eq("goal_id", goal.id);

      if (childObjectives && childObjectives.length > 0) {
        for (const obj of childObjectives) {
          await supabase.from("goals").insert({
            user_id: userId,
            title: obj.title,
            description: obj.description,
            status: obj.status,
            target_date: obj.target_date,
            vision_id: newVision.id,
          });
        }
      }

      await supabase.from("goals").delete().eq("id", goal.id);
      await Promise.all([loadVisions(), loadGoals(), loadObjectives()]);

      return newVision;
    },
    [userId, loadVisions, loadGoals, loadObjectives],
  );

  const convertGoalToObjective = useCallback(
    async (
      goal: Goal,
      targetGoalId: string | null,
    ): Promise<Objective | null> => {
      if (!userId) return null;

      const { data: newObjective, error: objError } = await supabase
        .from("objectives")
        .insert({
          user_id: userId,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          target_date: goal.target_date,
          priority: "medium",
          goal_id: targetGoalId,
        })
        .select()
        .single();

      if (objError || !newObjective) {
        console.error("Error converting goal to objective:", objError);
        return null;
      }

      const { data: childObjectives } = await supabase
        .from("objectives")
        .select("*")
        .eq("goal_id", goal.id);

      if (childObjectives && childObjectives.length > 0) {
        for (const obj of childObjectives) {
          await supabase.from("tasks").insert({
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

      await supabase.from("goals").delete().eq("id", goal.id);
      await Promise.all([loadGoals(), loadObjectives(), loadTasks()]);

      return newObjective;
    },
    [userId, loadGoals, loadObjectives, loadTasks],
  );

  const convertObjectiveToGoal = useCallback(
    async (
      objective: Objective,
      targetVisionId: string | null,
    ): Promise<Goal | null> => {
      if (!userId) return null;

      const { data: newGoal, error: goalError } = await supabase
        .from("goals")
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
        console.error("Error converting objective to goal:", goalError);
        return null;
      }

      const { data: childTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("objective_id", objective.id);

      if (childTasks && childTasks.length > 0) {
        for (const task of childTasks) {
          await supabase.from("objectives").insert({
            user_id: userId,
            title: task.title,
            description: task.description || "",
            status: task.status,
            target_date: task.due_date,
            priority: task.priority,
            goal_id: newGoal.id,
          });
        }
      }

      await supabase.from("objectives").delete().eq("id", objective.id);
      await Promise.all([loadGoals(), loadObjectives(), loadTasks()]);

      return newGoal;
    },
    [userId, loadGoals, loadObjectives, loadTasks],
  );

  const convertObjectiveToTask = useCallback(
    async (
      objective: Objective,
      targetObjectiveId: string | null,
    ): Promise<Task | null> => {
      if (!userId) return null;

      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
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
        console.error("Error converting objective to task:", taskError);
        return null;
      }

      await supabase
        .from("tasks")
        .update({ objective_id: null })
        .eq("objective_id", objective.id);

      await supabase.from("objectives").delete().eq("id", objective.id);
      await Promise.all([loadObjectives(), loadTasks()]);

      return newTask;
    },
    [userId, loadObjectives, loadTasks],
  );

  const convertTaskToObjective = useCallback(
    async (
      task: Task,
      targetGoalId: string | null,
    ): Promise<Objective | null> => {
      if (!userId) return null;

      const { data: newObjective, error: objError } = await supabase
        .from("objectives")
        .insert({
          user_id: userId,
          title: task.title,
          description: task.description || "",
          status: task.status,
          target_date: task.due_date,
          priority: task.priority,
          goal_id: targetGoalId,
        })
        .select()
        .single();

      if (objError || !newObjective) {
        console.error("Error converting task to objective:", objError);
        return null;
      }

      await supabase.from("tasks").delete().eq("id", task.id);
      await Promise.all([loadObjectives(), loadTasks()]);

      return newObjective;
    },
    [userId, loadObjectives, loadTasks],
  );

  return {
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

    convertVisionToGoal,
    convertGoalToVision,
    convertGoalToObjective,
    convertObjectiveToGoal,
    convertObjectiveToTask,
    convertTaskToObjective,
  };
}
