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
  [key: string]: any;
}

interface Objective {
  id: string;
  goal_id: string | null;
  [key: string]: any;
}

interface Task {
  id: string;
  objective_id: string | null;
  [key: string]: any;
}

export function createIsInSelectedFamily(
  selectionPath: SelectionPath,
  goals: Goal[],
  objectives: Objective[],
  tasks: Task[]
) {
  return (type: 'vision' | 'goal' | 'objective' | 'task', id: string): boolean => {
    // If nothing is selected, nothing is in a family
    if (!selectionPath.visionId && !selectionPath.goalId && !selectionPath.objectiveId && !selectionPath.taskId) {
      return false;
    }

    switch (type) {
      case 'vision': {
        // Vision is in family if:
        // 1. It's directly selected
        if (selectionPath.visionId === id) return true;
        // 2. Selected goal belongs to it
        if (selectionPath.goalId) {
          const goal = goals.find(g => g.id === selectionPath.goalId);
          if (goal?.vision_id === id) return true;
        }
        // 3. Selected objective's goal belongs to it
        if (selectionPath.objectiveId) {
          const obj = objectives.find(o => o.id === selectionPath.objectiveId);
          if (obj?.goal_id) {
            const goal = goals.find(g => g.id === obj.goal_id);
            if (goal?.vision_id === id) return true;
          }
        }
        // 4. Selected task's objective's goal belongs to it
        if (selectionPath.taskId) {
          const task = tasks.find(t => t.id === selectionPath.taskId);
          if (task?.objective_id) {
            const obj = objectives.find(o => o.id === task.objective_id);
            if (obj?.goal_id) {
              const goal = goals.find(g => g.id === obj.goal_id);
              if (goal?.vision_id === id) return true;
            }
          }
        }
        return false;
      }
      case 'goal': {
        if (selectionPath.goalId === id) return true;
        // Goal is in family if selected vision contains it
        if (selectionPath.visionId) {
          const goal = goals.find(g => g.id === id);
          if (goal?.vision_id === selectionPath.visionId) return true;
        }
        // Or if selected objective belongs to it
        if (selectionPath.objectiveId) {
          const obj = objectives.find(o => o.id === selectionPath.objectiveId);
          if (obj?.goal_id === id) return true;
        }
        // Or if selected task's objective belongs to it
        if (selectionPath.taskId) {
          const task = tasks.find(t => t.id === selectionPath.taskId);
          if (task?.objective_id) {
            const obj = objectives.find(o => o.id === task.objective_id);
            if (obj?.goal_id === id) return true;
          }
        }
        return false;
      }
      case 'objective': {
        if (selectionPath.objectiveId === id) return true;
        
        // Find this objective and trace its ancestry
        const obj = objectives.find(o => o.id === id);
        if (!obj) return false;
        
        // Check if selected vision is this objective's ancestor
        if (selectionPath.visionId && obj.goal_id) {
          const parentGoal = goals.find(g => g.id === obj.goal_id);
          if (parentGoal?.vision_id === selectionPath.visionId) return true;
        }
        
        // Check if selected goal is this objective's direct parent
        if (selectionPath.goalId && obj.goal_id === selectionPath.goalId) {
          return true;
        }
        
        // Check if selected task is this objective's descendant
        if (selectionPath.taskId) {
          const task = tasks.find(t => t.id === selectionPath.taskId);
          if (task?.objective_id === id) return true;
        }
        
        return false;
      }
      case 'task': {
        if (selectionPath.taskId === id) return true;
        
        // Find this task and trace its ancestry
        const task = tasks.find(t => t.id === id);
        if (!task) return false;
        
        // Check if selected objective is this task's direct parent
        if (selectionPath.objectiveId && task.objective_id === selectionPath.objectiveId) {
          return true;
        }
        
        // Check if selected goal is this task's ancestor (objective → goal)
        if (selectionPath.goalId && task.objective_id) {
          const parentObjective = objectives.find(o => o.id === task.objective_id);
          if (parentObjective?.goal_id === selectionPath.goalId) return true;
        }
        
        // Check if selected vision is this task's ancestor (objective → goal → vision)
        if (selectionPath.visionId && task.objective_id) {
          const parentObjective = objectives.find(o => o.id === task.objective_id);
          if (parentObjective?.goal_id) {
            const parentGoal = goals.find(g => g.id === parentObjective.goal_id);
            if (parentGoal?.vision_id === selectionPath.visionId) return true;
          }
        }
        
        return false;
      }
      default:
        return false;
    }
  };
}

