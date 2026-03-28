import { useObjectivesData } from "./useObjectivesData";
import { useObjectivesSelection } from "./useObjectivesSelection";
import { useObjectivesCRUD } from "./useObjectivesCRUD";
import { useUndo } from "../contexts/UndoContext";
import type {
  Vision,
  Goal,
  Objective,
  Task,
} from "../components/objectives/types";

export type { SelectionPath } from "./useObjectivesSelection";

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
  selectionPath: {
    visionId: string | null;
    goalId: string | null;
    objectiveId: string | null;
    taskId: string | null;
  };

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
  isInSelectedFamily: (
    type: "vision" | "goal" | "objective" | "task",
    id: string,
  ) => boolean;

  // Selection actions
  selectVision: (vision: Vision | null) => void;
  selectGoal: (goal: Goal | null) => void;
  selectObjective: (objective: Objective | null) => void;
  selectTask: (task: Task | null) => void;
  clearSelection: () => void;

  // CRUD operations
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

  // Conversion functions (convert between types)
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

  // Reload functions
  reloadAll: () => Promise<void>;
  reloadVisions: () => Promise<void>;
  reloadGoals: () => Promise<void>;
  reloadObjectives: () => Promise<void>;
  reloadTasks: () => Promise<void>;
}

export function useObjectivesState(
  userId: string | undefined,
): ObjectivesState {
  const data = useObjectivesData(userId);
  const selection = useObjectivesSelection(
    data.visions,
    data.goals,
    data.objectives,
    data.tasks,
  );
  const { pushUndo } = useUndo();
  const crud = useObjectivesCRUD(userId, data, selection, pushUndo);

  return {
    // Data
    visions: data.visions,
    goals: data.goals,
    objectives: data.objectives,
    tasks: data.tasks,
    loading: data.loading,
    taskCounts: data.taskCounts,

    // Selection
    selectedVision: selection.selectedVision,
    selectedGoal: selection.selectedGoal,
    selectedObjective: selection.selectedObjective,
    selectedTask: selection.selectedTask,
    selectionPath: selection.selectionPath,
    orphanedGoals: selection.orphanedGoals,
    orphanedObjectives: selection.orphanedObjectives,
    orphanedTasks: selection.orphanedTasks,
    getVisibleGoals: selection.getVisibleGoals,
    getVisibleObjectives: selection.getVisibleObjectives,
    getVisibleTasks: selection.getVisibleTasks,
    isInSelectedFamily: selection.isInSelectedFamily,
    selectVision: selection.selectVision,
    selectGoal: selection.selectGoal,
    selectObjective: selection.selectObjective,
    selectTask: selection.selectTask,
    clearSelection: selection.clearSelection,

    // CRUD
    ...crud,

    // Reload
    reloadAll: data.reloadAll,
    reloadVisions: data.loadVisions,
    reloadGoals: data.loadGoals,
    reloadObjectives: data.loadObjectives,
    reloadTasks: data.loadTasks,
  };
}
