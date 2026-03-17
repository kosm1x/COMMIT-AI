import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useObjectivesSelection } from "./useObjectivesSelection";
import { makeVision, makeGoal, makeObjective, makeTask } from "../test/helpers";

// Shared fixture data: V1 > G1 > O1 > T1, plus orphans
const v1 = makeVision({ id: "v1", title: "Vision 1" });
const v2 = makeVision({ id: "v2", title: "Vision 2" });
const g1 = makeGoal({ id: "g1", vision_id: "v1", title: "Goal 1" });
const g2 = makeGoal({ id: "g2", vision_id: "v2", title: "Goal 2" });
const gOrphan = makeGoal({
  id: "g-orphan",
  vision_id: null,
  title: "Orphan Goal",
});
const o1 = makeObjective({ id: "o1", goal_id: "g1", title: "Objective 1" });
const o2 = makeObjective({ id: "o2", goal_id: "g2", title: "Objective 2" });
const oOrphan = makeObjective({
  id: "o-orphan",
  goal_id: null,
  title: "Orphan Obj",
});
const t1 = makeTask({ id: "t1", objective_id: "o1", title: "Task 1" });
const t2 = makeTask({ id: "t2", objective_id: "o2", title: "Task 2" });
const tOrphan = makeTask({
  id: "t-orphan",
  objective_id: null,
  title: "Orphan Task",
});

const visions = [v1, v2];
const goals = [g1, g2, gOrphan];
const objectives = [o1, o2, oOrphan];
const tasks = [t1, t2, tOrphan];

function renderSelection() {
  return renderHook(() =>
    useObjectivesSelection(visions, goals, objectives, tasks),
  );
}

describe("useObjectivesSelection", () => {
  // ===== INITIAL STATE =====
  describe("initial state", () => {
    it("starts with all selection fields null", () => {
      const { result } = renderSelection();
      const { selectionPath } = result.current;

      expect(selectionPath.visionId).toBeNull();
      expect(selectionPath.goalId).toBeNull();
      expect(selectionPath.objectiveId).toBeNull();
      expect(selectionPath.taskId).toBeNull();
    });
  });

  // ===== SELECT VISION =====
  describe("selectVision", () => {
    it("sets visionId and clears lower levels", () => {
      const { result } = renderSelection();

      act(() => result.current.selectVision(v1));

      expect(result.current.selectionPath.visionId).toBe("v1");
      expect(result.current.selectionPath.goalId).toBeNull();
      expect(result.current.selectionPath.objectiveId).toBeNull();
      expect(result.current.selectionPath.taskId).toBeNull();
    });

    it("toggles off when selecting the same vision", () => {
      const { result } = renderSelection();

      act(() => result.current.selectVision(v1));
      act(() => result.current.selectVision(v1));

      expect(result.current.selectionPath.visionId).toBeNull();
      expect(result.current.selectionPath.goalId).toBeNull();
    });
  });

  // ===== SELECT GOAL =====
  describe("selectGoal", () => {
    it("sets goalId and auto-fills visionId from goal.vision_id", () => {
      const { result } = renderSelection();

      act(() => result.current.selectGoal(g1));

      expect(result.current.selectionPath.goalId).toBe("g1");
      expect(result.current.selectionPath.visionId).toBe("v1");
      expect(result.current.selectionPath.objectiveId).toBeNull();
    });

    it("toggles off goal but keeps visionId when selecting same goal", () => {
      const { result } = renderSelection();

      act(() => result.current.selectGoal(g1));
      act(() => result.current.selectGoal(g1));

      expect(result.current.selectionPath.goalId).toBeNull();
      // Vision is preserved via prev spread
      expect(result.current.selectionPath.visionId).toBe("v1");
    });
  });

  // ===== SELECT OBJECTIVE =====
  describe("selectObjective", () => {
    it("walks up: sets objectiveId, goalId, and visionId", () => {
      const { result } = renderSelection();

      act(() => result.current.selectObjective(o1));

      expect(result.current.selectionPath.objectiveId).toBe("o1");
      expect(result.current.selectionPath.goalId).toBe("g1");
      expect(result.current.selectionPath.visionId).toBe("v1");
      expect(result.current.selectionPath.taskId).toBeNull();
    });

    it("toggles off objective but keeps goal and vision when selecting same objective", () => {
      const { result } = renderSelection();

      act(() => result.current.selectObjective(o1));
      act(() => result.current.selectObjective(o1));

      expect(result.current.selectionPath.objectiveId).toBeNull();
      expect(result.current.selectionPath.goalId).toBe("g1");
      expect(result.current.selectionPath.visionId).toBe("v1");
    });
  });

  // ===== SELECT TASK =====
  describe("selectTask", () => {
    it("walks the full tree: task > objective > goal > vision", () => {
      const { result } = renderSelection();

      act(() => result.current.selectTask(t1));

      expect(result.current.selectionPath.taskId).toBe("t1");
      expect(result.current.selectionPath.objectiveId).toBe("o1");
      expect(result.current.selectionPath.goalId).toBe("g1");
      expect(result.current.selectionPath.visionId).toBe("v1");
    });

    it("toggles off only taskId when selecting same task", () => {
      const { result } = renderSelection();

      act(() => result.current.selectTask(t1));
      act(() => result.current.selectTask(t1));

      expect(result.current.selectionPath.taskId).toBeNull();
      // Parent levels preserved
      expect(result.current.selectionPath.objectiveId).toBe("o1");
      expect(result.current.selectionPath.goalId).toBe("g1");
      expect(result.current.selectionPath.visionId).toBe("v1");
    });
  });

  // ===== CLEAR SELECTION =====
  describe("clearSelection", () => {
    it("resets all fields to null", () => {
      const { result } = renderSelection();

      act(() => result.current.selectTask(t1));
      act(() => result.current.clearSelection());

      const { selectionPath } = result.current;
      expect(selectionPath.visionId).toBeNull();
      expect(selectionPath.goalId).toBeNull();
      expect(selectionPath.objectiveId).toBeNull();
      expect(selectionPath.taskId).toBeNull();
    });
  });

  // ===== ORPHAN LISTS =====
  describe("orphan lists", () => {
    it("orphanedGoals returns goals with vision_id === null", () => {
      const { result } = renderSelection();

      expect(result.current.orphanedGoals).toEqual([gOrphan]);
    });

    it("orphanedObjectives returns objectives with goal_id === null", () => {
      const { result } = renderSelection();

      expect(result.current.orphanedObjectives).toEqual([oOrphan]);
    });

    it("orphanedTasks returns tasks with objective_id === null", () => {
      const { result } = renderSelection();

      expect(result.current.orphanedTasks).toEqual([tOrphan]);
    });
  });

  // ===== VISIBILITY FILTERING =====
  describe("visibility filtering", () => {
    it("getVisibleGoals returns all goals when no vision selected", () => {
      const { result } = renderSelection();

      expect(result.current.getVisibleGoals()).toEqual(goals);
    });

    it("getVisibleGoals filters by visionId when a vision is selected", () => {
      const { result } = renderSelection();

      act(() => result.current.selectVision(v1));

      const visible = result.current.getVisibleGoals();
      expect(visible).toEqual([g1]);
    });

    it("getVisibleObjectives returns all when no goal selected", () => {
      const { result } = renderSelection();

      expect(result.current.getVisibleObjectives()).toEqual(objectives);
    });

    it("getVisibleObjectives filters by goalId when a goal is selected", () => {
      const { result } = renderSelection();

      act(() => result.current.selectGoal(g1));

      expect(result.current.getVisibleObjectives()).toEqual([o1]);
    });

    it("getVisibleTasks returns all when no objective selected", () => {
      const { result } = renderSelection();

      expect(result.current.getVisibleTasks()).toEqual(tasks);
    });

    it("getVisibleTasks filters by objectiveId when an objective is selected", () => {
      const { result } = renderSelection();

      act(() => result.current.selectObjective(o1));

      expect(result.current.getVisibleTasks()).toEqual([t1]);
    });
  });

  // ===== isInSelectedFamily =====
  describe("isInSelectedFamily", () => {
    it("returns false when nothing is selected", () => {
      const { result } = renderSelection();

      expect(result.current.isInSelectedFamily("vision", "v1")).toBe(false);
      expect(result.current.isInSelectedFamily("goal", "g1")).toBe(false);
      expect(result.current.isInSelectedFamily("task", "t1")).toBe(false);
    });

    it("returns true for a vision matching the selected visionId", () => {
      const { result } = renderSelection();

      act(() => result.current.selectVision(v1));

      expect(result.current.isInSelectedFamily("vision", "v1")).toBe(true);
      expect(result.current.isInSelectedFamily("vision", "v2")).toBe(false);
    });

    it("returns true for a goal matching goalId or whose vision_id matches visionId", () => {
      const { result } = renderSelection();

      act(() => result.current.selectGoal(g1));

      // Direct match on goalId
      expect(result.current.isInSelectedFamily("goal", "g1")).toBe(true);
      // g2 belongs to v2, not in family
      expect(result.current.isInSelectedFamily("goal", "g2")).toBe(false);
    });

    it("returns true for an objective matching objectiveId or whose goal_id matches goalId", () => {
      const { result } = renderSelection();

      act(() => result.current.selectObjective(o1));

      expect(result.current.isInSelectedFamily("objective", "o1")).toBe(true);
      expect(result.current.isInSelectedFamily("objective", "o2")).toBe(false);
    });

    it("returns true for a task matching taskId or whose objective matches objectiveId", () => {
      const { result } = renderSelection();

      act(() => result.current.selectObjective(o1));

      // t1.objective_id === "o1" matches the selected objectiveId
      expect(result.current.isInSelectedFamily("task", "t1")).toBe(true);
      // t2.objective_id === "o2" does not match
      expect(result.current.isInSelectedFamily("task", "t2")).toBe(false);
    });
  });

  // ===== RESOLVED SELECTIONS =====
  describe("resolved selection objects", () => {
    it("resolves selectedVision/Goal/Objective/Task from the arrays", () => {
      const { result } = renderSelection();

      act(() => result.current.selectTask(t1));

      expect(result.current.selectedVision).toEqual(v1);
      expect(result.current.selectedGoal).toEqual(g1);
      expect(result.current.selectedObjective).toEqual(o1);
      expect(result.current.selectedTask).toEqual(t1);
    });
  });
});
