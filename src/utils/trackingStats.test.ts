import { describe, it, expect } from "vitest";
import {
  calculateStatusCounts,
  calculateCompletionPercentage,
  getCompletionStats,
  filterByDateRange,
  filterCompletedInRange,
  getStartOfMonth,
  getEndOfMonth,
  getDaysInMonth,
  formatDate,
  formatShortDate,
} from "./trackingStats";

describe("calculateStatusCounts", () => {
  it("counts each status correctly", () => {
    const items = [
      { status: "not_started" },
      { status: "in_progress" },
      { status: "in_progress" },
      { status: "completed" },
      { status: "on_hold" },
    ];
    expect(calculateStatusCounts(items)).toEqual({
      not_started: 1,
      in_progress: 2,
      completed: 1,
      on_hold: 1,
      total: 5,
    });
  });

  it("returns all zeros for empty array", () => {
    expect(calculateStatusCounts([])).toEqual({
      not_started: 0,
      in_progress: 0,
      completed: 0,
      on_hold: 0,
      total: 0,
    });
  });
});

describe("calculateCompletionPercentage", () => {
  it("returns 0 for 0 total", () => {
    expect(calculateCompletionPercentage(0, 0)).toBe(0);
  });

  it("returns rounded percentage", () => {
    expect(calculateCompletionPercentage(1, 3)).toBe(33);
    expect(calculateCompletionPercentage(2, 3)).toBe(67);
    expect(calculateCompletionPercentage(3, 3)).toBe(100);
  });
});

describe("getCompletionStats", () => {
  it("combines completed count, total, and percentage", () => {
    const items = [
      { status: "completed" },
      { status: "completed" },
      { status: "not_started" },
    ];
    expect(getCompletionStats(items)).toEqual({
      completed: 2,
      total: 3,
      percentage: 67,
    });
  });
});

describe("filterByDateRange", () => {
  it("filters items whose created_at falls within the range", () => {
    const items = [
      { created_at: "2026-03-01T12:00:00Z" },
      { created_at: "2026-03-15T12:00:00Z" },
      { created_at: "2026-04-01T12:00:00Z" },
    ];
    const start = new Date("2026-03-01T00:00:00Z");
    const end = new Date("2026-03-31T23:59:59Z");

    const result = filterByDateRange(items, start, end);
    expect(result).toHaveLength(2);
  });
});

describe("filterCompletedInRange", () => {
  it("filters by completed_at, skipping null", () => {
    const items = [
      { completed_at: "2026-03-10T12:00:00Z" },
      { completed_at: null },
      { completed_at: "2026-04-05T12:00:00Z" },
    ];
    const start = new Date("2026-03-01T00:00:00Z");
    const end = new Date("2026-03-31T23:59:59Z");

    const result = filterCompletedInRange(items, start, end);
    expect(result).toHaveLength(1);
    expect(result[0].completed_at).toBe("2026-03-10T12:00:00Z");
  });
});

describe("getStartOfMonth", () => {
  it("returns first day of month at midnight", () => {
    const date = new Date(2026, 2, 17, 14, 30); // Mar 17 2026 14:30
    const start = getStartOfMonth(date);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});

describe("getEndOfMonth", () => {
  it("returns last day at 23:59:59.999", () => {
    const date = new Date(2026, 2, 17); // March 2026
    const end = getEndOfMonth(date);
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });
});

describe("getDaysInMonth", () => {
  it("returns 31 for March", () => {
    expect(getDaysInMonth(new Date(2026, 2, 1))).toBe(31);
  });

  it("returns 28 for non-leap February", () => {
    expect(getDaysInMonth(new Date(2026, 1, 1))).toBe(28);
  });

  it("returns 29 for leap February", () => {
    expect(getDaysInMonth(new Date(2028, 1, 1))).toBe(29);
  });
});

describe("formatDate", () => {
  it("formats as 'Mon DD, YYYY'", () => {
    const date = new Date(2026, 2, 15); // Mar 15 2026
    expect(formatDate(date)).toBe("Mar 15, 2026");
  });
});

describe("formatShortDate", () => {
  it("formats as 'Mon DD'", () => {
    const date = new Date(2026, 2, 15); // Mar 15 2026
    expect(formatShortDate(date)).toBe("Mar 15");
  });
});
