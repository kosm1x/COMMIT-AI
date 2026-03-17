import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock } from "../test/helpers";

const mockFrom = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("../components/objectives/utils", () => ({
  sanitizeInput: (input: string) => input.replace(/<[^>]*>/g, "").trim(),
}));

import { ObjectivesService } from "./objectivesService";

let service: ObjectivesService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new ObjectivesService("user-123");
});

describe("loadVisions", () => {
  it("returns data array on success", async () => {
    const visions = [
      { id: "v1", title: "Vision 1", user_id: "user-123" },
      { id: "v2", title: "Vision 2", user_id: "user-123" },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: visions, error: null }));

    const result = await service.loadVisions();
    expect(result).toEqual(visions);
    expect(mockFrom).toHaveBeenCalledWith("visions");
  });

  it("returns empty array on error", async () => {
    mockFrom.mockReturnValue(
      createChainMock({ data: null, error: { message: "db error" } }),
    );

    const result = await service.loadVisions();
    expect(result).toEqual([]);
  });
});

describe("createVision", () => {
  it("returns created vision on success", async () => {
    const created = {
      id: "v1",
      title: "New Vision",
      description: "Desc",
      user_id: "user-123",
    };
    mockFrom.mockReturnValue(createChainMock({ data: created, error: null }));

    const result = await service.createVision(
      "New Vision",
      "Desc",
      "2026-12-31",
    );
    expect(result).toEqual(created);
  });

  it("returns null on error", async () => {
    mockFrom.mockReturnValue(
      createChainMock({ data: null, error: { message: "insert failed" } }),
    );

    const result = await service.createVision("Test", "Desc", "");
    expect(result).toBeNull();
  });
});

describe("updateVision", () => {
  it("returns true on success", async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));

    const result = await service.updateVision("v1", { title: "Updated" });
    expect(result).toBe(true);
  });

  it("returns false on error", async () => {
    mockFrom.mockReturnValue(
      createChainMock({ data: null, error: { message: "update failed" } }),
    );

    const result = await service.updateVision("v1", { title: "Updated" });
    expect(result).toBe(false);
  });
});

describe("deleteVision", () => {
  it("returns true on success", async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));

    const result = await service.deleteVision("v1");
    expect(result).toBe(true);
  });

  it("returns false on error", async () => {
    mockFrom.mockReturnValue(
      createChainMock({ data: null, error: { message: "delete failed" } }),
    );

    const result = await service.deleteVision("v1");
    expect(result).toBe(false);
  });
});

describe("Goal operations", () => {
  it("loadGoals returns data on success", async () => {
    const goals = [{ id: "g1", title: "Goal 1" }];
    mockFrom.mockReturnValue(createChainMock({ data: goals, error: null }));

    const result = await service.loadGoals();
    expect(result).toEqual(goals);
    expect(mockFrom).toHaveBeenCalledWith("goals");
  });

  it("createGoal returns created goal", async () => {
    const goal = { id: "g1", title: "New Goal" };
    mockFrom.mockReturnValue(createChainMock({ data: goal, error: null }));

    const result = await service.createGoal("New Goal", "Desc", "", null);
    expect(result).toEqual(goal);
  });

  it("deleteGoal returns true on success", async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));

    expect(await service.deleteGoal("g1")).toBe(true);
  });
});

describe("Objective operations", () => {
  it("loadObjectives returns data on success", async () => {
    const objectives = [{ id: "o1", title: "Obj 1" }];
    mockFrom.mockReturnValue(
      createChainMock({ data: objectives, error: null }),
    );

    const result = await service.loadObjectives();
    expect(result).toEqual(objectives);
    expect(mockFrom).toHaveBeenCalledWith("objectives");
  });

  it("createObjective returns created objective", async () => {
    const obj = { id: "o1", title: "New Objective" };
    mockFrom.mockReturnValue(createChainMock({ data: obj, error: null }));

    const result = await service.createObjective(
      "New Objective",
      "Desc",
      "high",
      null,
      "",
    );
    expect(result).toEqual(obj);
  });
});

describe("Task operations", () => {
  it("loadTasks returns data on success", async () => {
    const tasks = [{ id: "t1", title: "Task 1" }];
    mockFrom.mockReturnValue(createChainMock({ data: tasks, error: null }));

    const result = await service.loadTasks();
    expect(result).toEqual(tasks);
    expect(mockFrom).toHaveBeenCalledWith("tasks");
  });

  it("createTask returns created task", async () => {
    const task = { id: "t1", title: "New Task" };
    mockFrom.mockReturnValue(createChainMock({ data: task, error: null }));

    const result = await service.createTask(
      "New Task",
      "medium",
      "",
      null,
      false,
    );
    expect(result).toEqual(task);
  });

  it("updateTask returns true on success", async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));

    expect(await service.updateTask("t1", { title: "Updated" })).toBe(true);
  });

  it("deleteTask returns false on error", async () => {
    mockFrom.mockReturnValue(
      createChainMock({ data: null, error: { message: "nope" } }),
    );

    expect(await service.deleteTask("t1")).toBe(false);
  });
});
