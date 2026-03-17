import { vi } from "vitest";
import type {
  Vision,
  Goal,
  Objective,
  Task,
} from "../components/objectives/types";

/**
 * Proxy-based chainable Supabase query mock.
 * Any chained method call (e.g. `.select().eq().single()`) returns another proxy,
 * and awaiting the chain resolves with the provided `{ data, error }`.
 */
export function createChainMock(resolveWith: {
  data: unknown;
  error: unknown;
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const handler = {
    get(_target: unknown, prop: string) {
      if (prop === "then") {
        // Make it thenable — resolves with { data, error }
        return (
          resolve: (v: unknown) => void,
          reject: (v: unknown) => void,
        ) => {
          return Promise.resolve(resolveWith).then(resolve, reject);
        };
      }
      if (!chain[prop]) {
        chain[prop] = vi.fn().mockReturnValue(new Proxy({}, handler));
      }
      return chain[prop];
    },
  };

  return new Proxy({}, handler);
}

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

export function makeVision(overrides?: Partial<Vision>): Vision {
  return {
    id: "v1",
    title: "Test Vision",
    description: null,
    status: "not_started",
    target_date: null,
    order: null,
    last_edited_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: "g1",
    vision_id: null,
    title: "Test Goal",
    description: null,
    status: "not_started",
    target_date: null,
    last_edited_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeObjective(overrides?: Partial<Objective>): Objective {
  return {
    id: "o1",
    goal_id: null,
    title: "Test Objective",
    description: null,
    status: "not_started",
    priority: "medium",
    target_date: null,
    last_edited_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: "t1",
    objective_id: null,
    title: "Test Task",
    description: null,
    status: "not_started",
    priority: "medium",
    due_date: null,
    completed_at: null,
    notes: null,
    document_links: null,
    last_edited_at: "2026-01-01T00:00:00Z",
    is_recurring: false,
    ...overrides,
  };
}
