import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  createChainMock,
  makeVision,
  makeGoal,
  makeTask,
} from "../test/helpers";

const mockFrom = vi.fn();
const mockRpc = vi.fn().mockResolvedValue({ data: 0, error: null });
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("../utils/autoSort", () => ({
  hasSessionSorted: vi.fn().mockReturnValue(true),
  markSessionSorted: vi.fn(),
  sortGoals: vi.fn((g: unknown[]) => g),
  sortObjectives: vi.fn((o: unknown[]) => o),
  sortTasks: vi.fn((t: unknown[]) => t),
}));

import { useObjectivesData } from "./useObjectivesData";

function setupMocks(
  data: {
    visions?: unknown[];
    goals?: unknown[];
    objectives?: unknown[];
    tasks?: unknown[];
  } = {},
) {
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case "visions":
        return createChainMock({
          data: data.visions || [],
          error: null,
        });
      case "goals":
        return createChainMock({
          data: data.goals || [],
          error: null,
        });
      case "objectives":
        return createChainMock({
          data: data.objectives || [],
          error: null,
        });
      case "tasks":
        return createChainMock({
          data: data.tasks || [],
          error: null,
        });
      default:
        return createChainMock({ data: [], error: null });
    }
  });
}

describe("useObjectivesData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty arrays and does not call supabase when userId is undefined", async () => {
    const { result } = renderHook(() => useObjectivesData(undefined));

    // Wait a tick to let any effects settle
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.visions).toEqual([]);
    expect(result.current.goals).toEqual([]);
    expect(result.current.objectives).toEqual([]);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.taskCounts).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("calls supabase.from('visions') when userId is provided", async () => {
    setupMocks();
    renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("visions");
    });
  });

  it("sets visions state with returned data", async () => {
    const testVisions = [makeVision({ id: "v1", title: "Vision A" })];
    setupMocks({ visions: testVisions });

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.visions).toEqual(testVisions);
    });
  });

  it("calls supabase.from('goals') when userId is provided", async () => {
    setupMocks();
    renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("goals");
    });
  });

  it("sets goals state with returned data", async () => {
    const testGoals = [makeGoal({ id: "g1", title: "Goal A" })];
    setupMocks({ goals: testGoals });

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.goals).toEqual(testGoals);
    });
  });

  it("calls supabase.from('tasks') when userId is provided", async () => {
    setupMocks();
    renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("tasks");
    });
  });

  it("sets tasks state with returned data", async () => {
    const testTasks = [makeTask({ id: "t1", title: "Task A" })];
    setupMocks({ tasks: testTasks });

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.tasks).toEqual(testTasks);
    });
  });

  it("calls supabase.from('objectives') when userId is provided", async () => {
    setupMocks();
    renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("objectives");
    });
  });

  it("computes taskCounts correctly from tasks with objective_ids", async () => {
    const testTasks = [
      makeTask({ id: "t1", objective_id: "o1", status: "not_started" }),
      makeTask({ id: "t2", objective_id: "o1", status: "completed" }),
      makeTask({ id: "t3", objective_id: "o1", status: "in_progress" }),
      makeTask({ id: "t4", objective_id: "o2", status: "completed" }),
      makeTask({ id: "t5", objective_id: "o2", status: "completed" }),
    ];
    setupMocks({ tasks: testTasks });

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.taskCounts).toEqual({
        o1: { total: 3, completed: 1 },
        o2: { total: 2, completed: 2 },
      });
    });
  });

  it("ignores tasks with null objective_id in taskCounts", async () => {
    const testTasks = [
      makeTask({ id: "t1", objective_id: null, status: "completed" }),
      makeTask({ id: "t2", objective_id: "o1", status: "completed" }),
    ];
    setupMocks({ tasks: testTasks });

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.taskCounts).toEqual({
        o1: { total: 1, completed: 1 },
      });
    });
    // Null objective_id task should not appear in counts
    expect(result.current.taskCounts).not.toHaveProperty("null");
  });

  it("handles supabase error without crashing", async () => {
    mockFrom.mockImplementation(() =>
      createChainMock({ data: null, error: { message: "DB error" } }),
    );

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // State remains empty — no crash
    expect(result.current.visions).toEqual([]);
    expect(result.current.goals).toEqual([]);
    expect(result.current.objectives).toEqual([]);
    expect(result.current.tasks).toEqual([]);
  });

  it("sets loading to true during reloadAll and false after", async () => {
    setupMocks();

    const { result } = renderHook(() => useObjectivesData("user-123"));

    // After initial load completes, loading should be false
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("reloadAll fetches all four tables", async () => {
    setupMocks();

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock call history
    mockFrom.mockClear();
    setupMocks();

    await act(async () => {
      await result.current.reloadAll();
    });

    expect(mockFrom).toHaveBeenCalledWith("visions");
    expect(mockFrom).toHaveBeenCalledWith("goals");
    expect(mockFrom).toHaveBeenCalledWith("objectives");
    expect(mockFrom).toHaveBeenCalledWith("tasks");
  });

  it("calls prune_completed_tasks RPC on initial load", async () => {
    setupMocks();
    renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("prune_completed_tasks");
    });
  });

  it("loads data even if prune RPC fails", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "function not found" },
    });
    setupMocks({
      visions: [makeVision({ id: "v1", title: "Survives prune failure" })],
    });

    const { result } = renderHook(() => useObjectivesData("user-123"));

    await waitFor(() => {
      expect(result.current.visions).toEqual([
        expect.objectContaining({ id: "v1" }),
      ]);
    });
  });
});
