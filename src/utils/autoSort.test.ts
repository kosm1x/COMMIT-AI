import { describe, it, expect, beforeEach } from "vitest";
import {
  hasSessionSorted,
  markSessionSorted,
  sortGoals,
  sortObjectives,
  sortTasks,
} from "./autoSort";
import { makeGoal, makeObjective, makeTask } from "../test/helpers";

beforeEach(() => {
  sessionStorage.clear();
});

describe("hasSessionSorted / markSessionSorted", () => {
  it("returns false when not yet marked", () => {
    expect(hasSessionSorted()).toBe(false);
  });

  it("returns true after marking", () => {
    markSessionSorted();
    expect(hasSessionSorted()).toBe(true);
  });
});

describe("sortGoals", () => {
  it("sorts by status importance (in_progress before not_started)", () => {
    const goals = [
      makeGoal({ id: "g1", status: "not_started" }),
      makeGoal({ id: "g2", status: "in_progress" }),
    ];
    const sorted = sortGoals(goals);
    expect(sorted.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("sorts completed last", () => {
    const goals = [
      makeGoal({ id: "g1", status: "completed" }),
      makeGoal({ id: "g2", status: "on_hold" }),
      makeGoal({ id: "g3", status: "in_progress" }),
    ];
    const sorted = sortGoals(goals);
    expect(sorted.map((g) => g.id)).toEqual(["g3", "g2", "g1"]);
  });

  it("breaks status tie by target_date (earlier first, null last)", () => {
    const goals = [
      makeGoal({ id: "g1", status: "not_started", target_date: null }),
      makeGoal({ id: "g2", status: "not_started", target_date: "2026-06-01" }),
      makeGoal({ id: "g3", status: "not_started", target_date: "2026-03-01" }),
    ];
    const sorted = sortGoals(goals);
    expect(sorted.map((g) => g.id)).toEqual(["g3", "g2", "g1"]);
  });

  it("breaks date tie by title alphabetically", () => {
    const goals = [
      makeGoal({ id: "g1", status: "not_started", title: "Zebra" }),
      makeGoal({ id: "g2", status: "not_started", title: "Alpha" }),
    ];
    const sorted = sortGoals(goals);
    expect(sorted.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("does not mutate the original array", () => {
    const goals = [
      makeGoal({ id: "g1", status: "completed" }),
      makeGoal({ id: "g2", status: "in_progress" }),
    ];
    const sorted = sortGoals(goals);
    expect(sorted).not.toBe(goals);
    expect(goals[0].id).toBe("g1");
  });
});

describe("sortObjectives", () => {
  it("sorts by status, then date, then priority, then title", () => {
    const objectives = [
      makeObjective({ id: "o1", status: "not_started", priority: "low" }),
      makeObjective({ id: "o2", status: "not_started", priority: "high" }),
    ];
    const sorted = sortObjectives(objectives);
    expect(sorted.map((o) => o.id)).toEqual(["o2", "o1"]);
  });

  it("status takes precedence over priority", () => {
    const objectives = [
      makeObjective({ id: "o1", status: "completed", priority: "high" }),
      makeObjective({ id: "o2", status: "in_progress", priority: "low" }),
    ];
    const sorted = sortObjectives(objectives);
    expect(sorted.map((o) => o.id)).toEqual(["o2", "o1"]);
  });
});

describe("sortTasks", () => {
  it("sorts by status, then due_date, then priority, then title", () => {
    const tasks = [
      makeTask({
        id: "t1",
        status: "not_started",
        due_date: "2026-12-01",
        priority: "medium",
      }),
      makeTask({
        id: "t2",
        status: "not_started",
        due_date: "2026-06-01",
        priority: "medium",
      }),
      makeTask({
        id: "t3",
        status: "in_progress",
        due_date: "2026-12-01",
        priority: "medium",
      }),
    ];
    const sorted = sortTasks(tasks);
    expect(sorted.map((t) => t.id)).toEqual(["t3", "t2", "t1"]);
  });

  it("null due_date sorts after real dates", () => {
    const tasks = [
      makeTask({ id: "t1", status: "not_started", due_date: null }),
      makeTask({ id: "t2", status: "not_started", due_date: "2026-01-15" }),
    ];
    const sorted = sortTasks(tasks);
    expect(sorted.map((t) => t.id)).toEqual(["t2", "t1"]);
  });
});
