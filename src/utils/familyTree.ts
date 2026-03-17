// Shared utility for determining if items are in the selected family tree
// This ensures consistent filtering behavior across Objectives page and Kanban boards

interface SelectionPath {
  visionId: string | null;
  goalId: string | null;
  objectiveId: string | null;
  taskId: string | null;
}

interface Goal {
  id: string;
  vision_id: string | null;
}

interface Objective {
  id: string;
  goal_id: string | null;
}

interface Task {
  id: string;
  objective_id: string | null;
}

// Resolve full ancestor chain from selection path (mirrors useObjectivesState effectivePath)
function getEffectivePath(
  selectionPath: SelectionPath,
  goals: Goal[],
  objectives: Objective[],
  tasks: Task[],
): SelectionPath {
  const { visionId, goalId, objectiveId, taskId } = selectionPath;
  let effVision: string | null = visionId ?? null;
  let effGoal: string | null = goalId ?? null;
  let effObjective: string | null = objectiveId ?? null;

  if (taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (task?.objective_id) {
      const obj = objectives.find((o) => o.id === task.objective_id);
      if (obj) {
        if (effObjective === null) effObjective = obj.id;
        if (effGoal === null && obj.goal_id) effGoal = obj.goal_id;
        if (effVision === null && obj.goal_id) {
          const g = goals.find((gr) => gr.id === obj.goal_id);
          if (g?.vision_id) effVision = g.vision_id;
        }
      }
    }
  }
  if (objectiveId && (effGoal === null || effVision === null)) {
    const obj = objectives.find((o) => o.id === objectiveId);
    if (obj?.goal_id) {
      if (effGoal === null) effGoal = obj.goal_id;
      if (effVision === null) {
        const g = goals.find((gr) => gr.id === obj.goal_id);
        if (g?.vision_id) effVision = g.vision_id;
      }
    }
  }
  if (goalId && effVision === null) {
    const g = goals.find((gr) => gr.id === goalId);
    if (g?.vision_id) effVision = g.vision_id;
  }

  return {
    visionId: effVision,
    goalId: effGoal,
    objectiveId: effObjective,
    taskId: taskId ?? null,
  };
}

export function createIsInSelectedFamily(
  selectionPath: SelectionPath,
  goals: Goal[],
  objectives: Objective[],
  tasks: Task[],
) {
  return (
    type: "vision" | "goal" | "objective" | "task",
    id: string,
  ): boolean => {
    const { visionId, goalId, objectiveId, taskId } = getEffectivePath(
      selectionPath,
      goals,
      objectives,
      tasks,
    );
    if (!visionId && !goalId && !objectiveId && !taskId) return false;

    switch (type) {
      case "vision": {
        return id === visionId;
      }
      case "goal": {
        if (id === goalId) return true;
        const goal = goals.find((g) => g.id === id);
        if (!goal) return false;
        return visionId !== null && goal.vision_id === visionId;
      }
      case "objective": {
        if (id === objectiveId) return true;
        const obj = objectives.find((o) => o.id === id);
        if (!obj) return false;
        if (goalId !== null && obj.goal_id === goalId) return true;
        // Vision only selected (no goal selected): all objectives under any goal of that vision
        if (visionId !== null && goalId === null && obj.goal_id) {
          const g = goals.find((gr) => gr.id === obj.goal_id);
          if (g?.vision_id === visionId) return true;
        }
        return false;
      }
      case "task": {
        if (id === taskId) return true;
        const task = tasks.find((t) => t.id === id);
        if (!task?.objective_id) return false;
        if (objectiveId !== null && task.objective_id === objectiveId)
          return true;
        // Goal selected: all tasks under that goal (more specific - takes precedence)
        if (goalId !== null) {
          const obj = objectives.find((o) => o.id === task.objective_id);
          if (obj?.goal_id === goalId) return true;
        }
        // Vision selected (but no goal selected): all tasks under that vision
        if (visionId !== null && goalId === null) {
          const obj = objectives.find((o) => o.id === task.objective_id);
          if (obj?.goal_id) {
            const g = goals.find((gr) => gr.id === obj.goal_id);
            if (g?.vision_id === visionId) return true;
          }
        }
        return false;
      }
      default:
        return false;
    }
  };
}
