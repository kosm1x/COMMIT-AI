import { useState, useCallback, useMemo } from "react";
import { Vision, Goal, Objective, Task } from "../components/objectives/types";

export interface SelectionPath {
  visionId: string | null;
  goalId: string | null;
  objectiveId: string | null;
  taskId: string | null;
}

export interface ObjectivesSelectionState {
  selectionPath: SelectionPath;
  selectedVision: Vision | null;
  selectedGoal: Goal | null;
  selectedObjective: Objective | null;
  selectedTask: Task | null;
  orphanedGoals: Goal[];
  orphanedObjectives: Objective[];
  orphanedTasks: Task[];
  getVisibleGoals: () => Goal[];
  getVisibleObjectives: () => Objective[];
  getVisibleTasks: () => Task[];
  isInSelectedFamily: (
    type: "vision" | "goal" | "objective" | "task",
    id: string,
  ) => boolean;
  selectVision: (vision: Vision | null) => void;
  selectGoal: (goal: Goal | null) => void;
  selectObjective: (objective: Objective | null) => void;
  selectTask: (task: Task | null) => void;
  clearSelection: () => void;
  setSelectionPath: React.Dispatch<React.SetStateAction<SelectionPath>>;
}

export function useObjectivesSelection(
  visions: Vision[],
  goals: Goal[],
  objectives: Objective[],
  tasks: Task[],
): ObjectivesSelectionState {
  const [selectionPath, setSelectionPath] = useState<SelectionPath>({
    visionId: null,
    goalId: null,
    objectiveId: null,
    taskId: null,
  });

  // ===== RESOLVED SELECTIONS =====
  const selectedVision = useMemo(
    () => visions.find((v) => v.id === selectionPath.visionId) || null,
    [visions, selectionPath.visionId],
  );

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectionPath.goalId) || null,
    [goals, selectionPath.goalId],
  );

  const selectedObjective = useMemo(
    () => objectives.find((o) => o.id === selectionPath.objectiveId) || null,
    [objectives, selectionPath.objectiveId],
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectionPath.taskId) || null,
    [tasks, selectionPath.taskId],
  );

  // ===== ORPHAN LISTS =====
  const orphanedGoals = useMemo(
    () => goals.filter((g) => g.vision_id === null),
    [goals],
  );

  const orphanedObjectives = useMemo(
    () => objectives.filter((o) => o.goal_id === null),
    [objectives],
  );

  const orphanedTasks = useMemo(
    () => tasks.filter((t) => t.objective_id === null),
    [tasks],
  );

  // ===== LOOKUP MAPS FOR O(1) ACCESS =====
  const goalsById = useMemo(() => {
    const map = new Map<string, Goal>();
    goals.forEach((g) => map.set(g.id, g));
    return map;
  }, [goals]);

  const objectivesById = useMemo(() => {
    const map = new Map<string, Objective>();
    objectives.forEach((o) => map.set(o.id, o));
    return map;
  }, [objectives]);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tasks]);

  // ===== VISIBILITY LOGIC =====
  const getVisibleGoals = useCallback(() => {
    if (selectionPath.visionId) {
      return goals.filter((g) => g.vision_id === selectionPath.visionId);
    }
    return goals;
  }, [goals, selectionPath.visionId]);

  const getVisibleObjectives = useCallback(() => {
    if (selectionPath.goalId) {
      return objectives.filter((o) => o.goal_id === selectionPath.goalId);
    }
    return objectives;
  }, [objectives, selectionPath.goalId]);

  const getVisibleTasks = useCallback(() => {
    if (selectionPath.objectiveId) {
      return tasks.filter((t) => t.objective_id === selectionPath.objectiveId);
    }
    return tasks;
  }, [tasks, selectionPath.objectiveId]);

  // ===== FAMILY TREE HELPERS =====
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

    return {
      visionId: effVision,
      goalId: effGoal,
      objectiveId: effObjective,
      taskId: effTask,
    };
  }, [selectionPath, goalsById, objectivesById, tasksById]);

  const isInSelectedFamily = useCallback(
    (type: "vision" | "goal" | "objective" | "task", id: string): boolean => {
      const { visionId, goalId, objectiveId, taskId } = effectivePath;
      if (!visionId && !goalId && !objectiveId && !taskId) return false;

      // Determine the "deepest" selected level from the original selectionPath
      // (not effectivePath which auto-fills parents). This tells us what the
      // user actually clicked — filtering behavior differs based on this.
      const selectedLevel = selectionPath.taskId
        ? "task"
        : selectionPath.objectiveId
          ? "objective"
          : selectionPath.goalId
            ? "goal"
            : selectionPath.visionId
              ? "vision"
              : null;

      switch (type) {
        case "vision": {
          return id === visionId;
        }
        case "goal": {
          if (id === goalId) return true;
          // Only show sibling goals (same vision) if the user selected
          // at the vision level. If they selected deeper (objective/task),
          // only the exact parent goal should match.
          if (selectedLevel === "vision") {
            const goal = goalsById.get(id);
            if (!goal) return false;
            return visionId !== null && goal.vision_id === visionId;
          }
          return false;
        }
        case "objective": {
          if (id === objectiveId) return true;
          const obj = objectivesById.get(id);
          if (!obj) return false;
          // Show sibling objectives (same goal) only if user selected
          // at goal level. If deeper (task), only exact parent matches.
          if (selectedLevel === "goal") {
            return goalId !== null && obj.goal_id === goalId;
          }
          if (selectedLevel === "vision") {
            if (goalId !== null && obj.goal_id === goalId) return true;
            if (visionId !== null && obj.goal_id) {
              const g = goalsById.get(obj.goal_id);
              if (g?.vision_id === visionId) return true;
            }
          }
          return false;
        }
        case "task": {
          if (id === taskId) return true;
          const task = tasksById.get(id);
          if (!task?.objective_id) return false;
          // Show sibling tasks (same objective) only if user selected
          // at objective level or higher. If a specific task is selected,
          // only that exact task matches.
          if (selectedLevel === "task") return false;
          if (selectedLevel === "objective") {
            return objectiveId !== null && task.objective_id === objectiveId;
          }
          if (selectedLevel === "goal") {
            const obj = objectivesById.get(task.objective_id);
            return goalId !== null && obj?.goal_id === goalId;
          }
          if (selectedLevel === "vision") {
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
    },
    [effectivePath, selectionPath, goalsById, objectivesById, tasksById],
  );

  // ===== SELECTION ACTIONS =====
  const selectVision = useCallback(
    (vision: Vision | null) => {
      if (vision && selectionPath.visionId === vision.id) {
        setSelectionPath({
          visionId: null,
          goalId: null,
          objectiveId: null,
          taskId: null,
        });
      } else {
        setSelectionPath({
          visionId: vision?.id || null,
          goalId: null,
          objectiveId: null,
          taskId: null,
        });
      }
    },
    [selectionPath.visionId],
  );

  const selectGoal = useCallback(
    (goal: Goal | null) => {
      if (goal && selectionPath.goalId === goal.id) {
        setSelectionPath((prev) => ({
          ...prev,
          goalId: null,
          objectiveId: null,
          taskId: null,
        }));
      } else {
        setSelectionPath({
          visionId: goal?.vision_id ?? null,
          goalId: goal?.id ?? null,
          objectiveId: null,
          taskId: null,
        });
      }
    },
    [selectionPath.goalId],
  );

  const selectObjective = useCallback(
    (objective: Objective | null) => {
      if (objective && selectionPath.objectiveId === objective.id) {
        setSelectionPath((prev) => ({
          ...prev,
          objectiveId: null,
          taskId: null,
        }));
      } else {
        const parentGoal = objective?.goal_id
          ? goalsById.get(objective.goal_id)
          : null;
        setSelectionPath({
          visionId: parentGoal?.vision_id ?? null,
          goalId: objective?.goal_id ?? null,
          objectiveId: objective?.id ?? null,
          taskId: null,
        });
      }
    },
    [selectionPath.objectiveId, goalsById],
  );

  const selectTask = useCallback(
    (task: Task | null) => {
      if (task && selectionPath.taskId === task.id) {
        setSelectionPath((prev) => ({ ...prev, taskId: null }));
      } else {
        const obj = task?.objective_id
          ? objectivesById.get(task.objective_id)
          : null;
        const parentGoal = obj?.goal_id ? goalsById.get(obj.goal_id) : null;
        setSelectionPath({
          visionId: parentGoal?.vision_id ?? null,
          goalId: obj?.goal_id ?? null,
          objectiveId: task?.objective_id ?? null,
          taskId: task?.id ?? null,
        });
      }
    },
    [selectionPath.taskId, objectivesById, goalsById],
  );

  const clearSelection = useCallback(() => {
    setSelectionPath({
      visionId: null,
      goalId: null,
      objectiveId: null,
      taskId: null,
    });
  }, []);

  return {
    selectionPath,
    selectedVision,
    selectedGoal,
    selectedObjective,
    selectedTask,
    orphanedGoals,
    orphanedObjectives,
    orphanedTasks,
    getVisibleGoals,
    getVisibleObjectives,
    getVisibleTasks,
    isInSelectedFamily,
    selectVision,
    selectGoal,
    selectObjective,
    selectTask,
    clearSelection,
    setSelectionPath,
  };
}
