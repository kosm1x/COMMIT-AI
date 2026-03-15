import { Goal, Objective, Task } from "../components/objectives/types";

const SESSION_SORT_KEY = "commit_session_sorted";

export function hasSessionSorted(): boolean {
  return sessionStorage.getItem(SESSION_SORT_KEY) === "true";
}

export function markSessionSorted(): void {
  sessionStorage.setItem(SESSION_SORT_KEY, "true");
}

const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const statusImportance: Record<string, number> = {
  in_progress: 0,
  not_started: 1,
  on_hold: 2,
  completed: 3,
};

function parseDate(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? Infinity : d.getTime();
}

export function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const statusA = statusImportance[a.status || "not_started"] ?? 99;
    const statusB = statusImportance[b.status || "not_started"] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    const dateA = parseDate(a.target_date);
    const dateB = parseDate(b.target_date);
    if (dateA !== dateB) return dateA - dateB;

    return a.title.localeCompare(b.title);
  });
}

export function sortObjectives(objectives: Objective[]): Objective[] {
  return [...objectives].sort((a, b) => {
    const statusA = statusImportance[a.status || "not_started"] ?? 99;
    const statusB = statusImportance[b.status || "not_started"] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    const dateA = parseDate(a.target_date);
    const dateB = parseDate(b.target_date);
    if (dateA !== dateB) return dateA - dateB;

    const prioA = priorityOrder[a.priority || "medium"] ?? 99;
    const prioB = priorityOrder[b.priority || "medium"] ?? 99;
    if (prioA !== prioB) return prioA - prioB;

    return a.title.localeCompare(b.title);
  });
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusA = statusImportance[a.status || "not_started"] ?? 99;
    const statusB = statusImportance[b.status || "not_started"] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    const dateA = parseDate(a.due_date);
    const dateB = parseDate(b.due_date);
    if (dateA !== dateB) return dateA - dateB;

    const prioA = priorityOrder[a.priority || "medium"] ?? 99;
    const prioB = priorityOrder[b.priority || "medium"] ?? 99;
    if (prioA !== prioB) return prioA - prioB;

    return a.title.localeCompare(b.title);
  });
}
