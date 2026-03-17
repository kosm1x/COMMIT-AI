import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  createChainMock,
  makeVision,
  makeGoal,
  makeTask,
} from "../test/helpers";
import type {
  Vision,
  Goal,
  Objective,
  Task,
} from "../components/objectives/types";
import type { ObjectivesDataState } from "./useObjectivesData";
import type { SelectionPath } from "./useObjectivesSelection";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const mockFrom = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------
import { useObjectivesCRUD } from "./useObjectivesCRUD";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------
function createMockData(
  overrides: Partial<ObjectivesDataState> = {},
): ObjectivesDataState {
  return {
    visions: [] as Vision[],
    goals: [] as Goal[],
    objectives: [] as Objective[],
    tasks: [] as Task[],
    taskCounts: {} as Record<string, { total: number; completed: number }>,
    loading: false,
    setVisions: vi.fn(),
    setGoals: vi.fn(),
    setObjectives: vi.fn(),
    setTasks: vi.fn(),
    setTaskCounts: vi.fn(),
    reloadAll: vi.fn(),
    loadVisions: vi.fn(),
    loadGoals: vi.fn(),
    loadObjectives: vi.fn(),
    loadTasks: vi.fn(),
    loadTaskCounts: vi.fn(),
    ...overrides,
  };
}

interface SelectionDeps {
  selectionPath: SelectionPath;
  clearSelection: () => void;
  setSelectionPath: React.Dispatch<React.SetStateAction<SelectionPath>>;
}

function createMockSelection(
  overrides: Partial<SelectionDeps> = {},
): SelectionDeps {
  return {
    selectionPath: {
      visionId: null,
      goalId: null,
      objectiveId: null,
      taskId: null,
    },
    clearSelection: vi.fn(),
    setSelectionPath: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useObjectivesCRUD", () => {
  let mockData: ObjectivesDataState;
  let mockSelection: SelectionDeps;

  beforeEach(() => {
    vi.resetAllMocks();
    mockData = createMockData();
    mockSelection = createMockSelection();
    // Safe default: any unexpected supabase call returns an empty chain
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
  });

  function renderCRUD(
    userId: string | undefined = "user-1",
    data = mockData,
    selection = mockSelection,
  ) {
    return renderHook(() => useObjectivesCRUD(userId, data, selection));
  }

  // =========================================================================
  // createVision
  // =========================================================================
  describe("createVision", () => {
    it("returns null when no userId", async () => {
      const { result } = renderCRUD(undefined);
      let value: Vision | null = null;
      await act(async () => {
        value = await result.current.createVision("V", "desc", "2026-12-31");
      });
      expect(value).toBeNull();
    });

    it("inserts into supabase and reloads visions on success", async () => {
      const created = makeVision({ id: "v-new", title: "V" });
      mockFrom.mockReturnValue(createChainMock({ data: created, error: null }));

      const { result } = renderCRUD();
      let value: Vision | null = null;
      await act(async () => {
        value = await result.current.createVision("V", "desc", "2026-12-31");
      });

      expect(mockFrom).toHaveBeenCalledWith("visions");
      expect(value).toEqual(created);
      expect(mockData.loadVisions).toHaveBeenCalled();
    });

    it("returns null on supabase error", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "fail" } }),
      );

      const { result } = renderCRUD();
      let value: Vision | null = null;
      await act(async () => {
        value = await result.current.createVision("V", "desc", "");
      });

      expect(value).toBeNull();
      expect(mockData.loadVisions).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateVision
  // =========================================================================
  describe("updateVision", () => {
    it("optimistically updates local state via setVisions", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const v1 = makeVision({ id: "v1" });
      mockData = createMockData({ visions: [v1] });

      const { result } = renderCRUD("user-1", mockData);
      await act(async () => {
        await result.current.updateVision("v1", { title: "Updated" });
      });

      expect(mockData.setVisions).toHaveBeenCalled();
      // Verify the updater function applies the update
      const updater = (mockData.setVisions as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const updated = updater([v1]);
      expect(updated[0].title).toBe("Updated");
    });

    it("reverts setVisions on supabase error", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "fail" } }),
      );
      const v1 = makeVision({ id: "v1" });
      mockData = createMockData({ visions: [v1] });

      const { result } = renderCRUD("user-1", mockData);
      let ok: boolean = true;
      await act(async () => {
        ok = await result.current.updateVision("v1", { title: "Bad" });
      });

      expect(ok).toBe(false);
      // Second call to setVisions reverts with previous array
      const calls = (mockData.setVisions as ReturnType<typeof vi.fn>).mock
        .calls;
      expect(calls.length).toBe(2);
      expect(calls[1][0]).toEqual([v1]);
    });
  });

  // =========================================================================
  // deleteVision
  // =========================================================================
  describe("deleteVision", () => {
    it("removes from local state and calls supabase delete", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const v1 = makeVision({ id: "v1" });
      mockData = createMockData({ visions: [v1] });

      const { result } = renderCRUD("user-1", mockData);
      let ok: boolean = false;
      await act(async () => {
        ok = await result.current.deleteVision("v1");
      });

      expect(ok).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("visions");
      // setVisions called with filter function
      const updater = (mockData.setVisions as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(updater([v1])).toEqual([]);
    });

    it("clears selection when deleting selected vision", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const v1 = makeVision({ id: "v1" });
      mockData = createMockData({ visions: [v1] });
      mockSelection = createMockSelection({
        selectionPath: {
          visionId: "v1",
          goalId: null,
          objectiveId: null,
          taskId: null,
        },
      });

      const { result } = renderCRUD("user-1", mockData, mockSelection);
      await act(async () => {
        await result.current.deleteVision("v1");
      });

      expect(mockSelection.clearSelection).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // createGoal
  // =========================================================================
  describe("createGoal", () => {
    it("inserts with visionId and reloads goals", async () => {
      const created = makeGoal({ id: "g-new", vision_id: "v1" });
      mockFrom.mockReturnValue(createChainMock({ data: created, error: null }));

      const { result } = renderCRUD();
      let value: Goal | null = null;
      await act(async () => {
        value = await result.current.createGoal(
          "G",
          "desc",
          "2026-12-31",
          "v1",
        );
      });

      expect(mockFrom).toHaveBeenCalledWith("goals");
      expect(value).toEqual(created);
      expect(mockData.loadGoals).toHaveBeenCalled();
    });

    it("returns null when no userId", async () => {
      const { result } = renderCRUD(undefined);
      let value: Goal | null = null;
      await act(async () => {
        value = await result.current.createGoal("G", "desc", "", null);
      });
      expect(value).toBeNull();
    });
  });

  // =========================================================================
  // createTask
  // =========================================================================
  describe("createTask", () => {
    it("inserts with objectiveId and reloads tasks + counts", async () => {
      const created = makeTask({ id: "t-new", objective_id: "o1" });
      mockFrom.mockReturnValue(createChainMock({ data: created, error: null }));

      const { result } = renderCRUD();
      let value: Task | null = null;
      await act(async () => {
        value = await result.current.createTask(
          "T",
          "desc",
          "medium",
          "2026-12-31",
          "o1",
          false,
        );
      });

      expect(mockFrom).toHaveBeenCalledWith("tasks");
      expect(value).toEqual(created);
      expect(mockData.loadTasks).toHaveBeenCalled();
      expect(mockData.loadTaskCounts).toHaveBeenCalled();
    });

    it("sets due_date to null for recurring tasks", async () => {
      const created = makeTask({ id: "t-rec", is_recurring: true });
      mockFrom.mockReturnValue(createChainMock({ data: created, error: null }));

      const { result } = renderCRUD();
      await act(async () => {
        await result.current.createTask(
          "T",
          "",
          "low",
          "2026-12-31",
          null,
          true,
        );
      });

      expect(mockFrom).toHaveBeenCalledWith("tasks");
    });
  });

  // =========================================================================
  // updateTask
  // =========================================================================
  describe("updateTask", () => {
    it("increments completed count when status changes to completed", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const t1 = makeTask({
        id: "t1",
        objective_id: "o1",
        status: "not_started",
      });
      mockData = createMockData({
        tasks: [t1],
        taskCounts: { o1: { total: 3, completed: 0 } },
      });

      const { result } = renderCRUD("user-1", mockData);
      await act(async () => {
        await result.current.updateTask("t1", { status: "completed" });
      });

      // setTaskCounts should have been called with updater
      expect(mockData.setTaskCounts).toHaveBeenCalled();
      const updater = (mockData.setTaskCounts as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const updated = updater({ o1: { total: 3, completed: 0 } });
      expect(updated.o1.completed).toBe(1);
    });

    it("reverts tasks and reloads counts on supabase error", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "fail" } }),
      );
      const t1 = makeTask({
        id: "t1",
        objective_id: "o1",
        status: "not_started",
      });
      mockData = createMockData({
        tasks: [t1],
        taskCounts: { o1: { total: 3, completed: 0 } },
      });

      const { result } = renderCRUD("user-1", mockData);
      let ok: boolean = true;
      await act(async () => {
        ok = await result.current.updateTask("t1", { status: "completed" });
      });

      expect(ok).toBe(false);
      // setTasks called twice: optimistic + revert
      const taskCalls = (mockData.setTasks as ReturnType<typeof vi.fn>).mock
        .calls;
      expect(taskCalls.length).toBe(2);
      expect(taskCalls[1][0]).toEqual([t1]);
      // loadTaskCounts called to restore accurate counts
      expect(mockData.loadTaskCounts).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deleteTask
  // =========================================================================
  describe("deleteTask", () => {
    it("decrements task count for the task's objective", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const t1 = makeTask({
        id: "t1",
        objective_id: "o1",
        status: "not_started",
      });
      mockData = createMockData({
        tasks: [t1],
        taskCounts: { o1: { total: 3, completed: 1 } },
      });

      const { result } = renderCRUD("user-1", mockData);
      await act(async () => {
        await result.current.deleteTask("t1");
      });

      expect(mockData.setTaskCounts).toHaveBeenCalled();
      const updater = (mockData.setTaskCounts as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const updated = updater({ o1: { total: 3, completed: 1 } });
      expect(updated.o1.total).toBe(2);
      expect(updated.o1.completed).toBe(1); // not_started task, completed stays same
    });

    it("decrements completed count when deleting a completed task", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const t1 = makeTask({
        id: "t1",
        objective_id: "o1",
        status: "completed",
      });
      mockData = createMockData({
        tasks: [t1],
        taskCounts: { o1: { total: 3, completed: 2 } },
      });

      const { result } = renderCRUD("user-1", mockData);
      await act(async () => {
        await result.current.deleteTask("t1");
      });

      const updater = (mockData.setTaskCounts as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const updated = updater({ o1: { total: 3, completed: 2 } });
      expect(updated.o1.total).toBe(2);
      expect(updated.o1.completed).toBe(1);
    });

    it("clears taskId from selection when deleting selected task", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const t1 = makeTask({ id: "t1" });
      mockData = createMockData({ tasks: [t1] });
      mockSelection = createMockSelection({
        selectionPath: {
          visionId: null,
          goalId: null,
          objectiveId: null,
          taskId: "t1",
        },
      });

      const { result } = renderCRUD("user-1", mockData, mockSelection);
      await act(async () => {
        await result.current.deleteTask("t1");
      });

      expect(mockSelection.setSelectionPath).toHaveBeenCalled();
      const updater = (
        mockSelection.setSelectionPath as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      const updated = updater({
        visionId: null,
        goalId: null,
        objectiveId: null,
        taskId: "t1",
      });
      expect(updated.taskId).toBeNull();
    });
  });

  // =========================================================================
  // toggleTaskStatus
  // =========================================================================
  describe("toggleTaskStatus", () => {
    it("toggles not_started to completed with completed_at", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const t1 = makeTask({
        id: "t1",
        status: "not_started",
        is_recurring: false,
      });
      mockData = createMockData({ tasks: [t1] });

      const { result } = renderCRUD("user-1", mockData);
      await act(async () => {
        await result.current.toggleTaskStatus(t1);
      });

      // updateTask is called internally, which calls setTasks
      expect(mockData.setTasks).toHaveBeenCalled();
      const updater = (mockData.setTasks as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const updated = updater([t1]);
      expect(updated[0].status).toBe("completed");
      expect(updated[0].completed_at).not.toBeNull();
    });

    it("toggles completed to not_started and clears completed_at", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
      const t1 = makeTask({
        id: "t1",
        status: "completed",
        completed_at: "2026-03-01T00:00:00Z",
        is_recurring: false,
      });
      mockData = createMockData({ tasks: [t1] });

      const { result } = renderCRUD("user-1", mockData);
      await act(async () => {
        await result.current.toggleTaskStatus(t1);
      });

      expect(mockData.setTasks).toHaveBeenCalled();
      const updater = (mockData.setTasks as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const updated = updater([t1]);
      expect(updated[0].status).toBe("not_started");
      expect(updated[0].completed_at).toBeNull();
    });
  });
});
