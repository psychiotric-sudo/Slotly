import { describe, expect, it } from "vitest";
import {
  rangesOverlap,
  findConflicts,
  findConflictPairs,
  findBestSectionFits,
  layoutCourses,
} from "./conflicts";
import { courseGroupKey } from "./colors";
import { makeBreak, makeCourses } from "../test/fixtures";

describe("rangesOverlap", () => {
  it("detects partial and full overlaps", () => {
    expect(rangesOverlap("08:00", "09:00", "08:30", "09:30")).toBe(true);
    expect(rangesOverlap("08:00", "10:00", "08:30", "09:00")).toBe(true);
    expect(rangesOverlap("08:00", "09:00", "08:00", "09:00")).toBe(true);
  });

  it("treats touching endpoints as non-overlapping", () => {
    expect(rangesOverlap("08:00", "09:00", "09:00", "10:00")).toBe(false);
    expect(rangesOverlap("08:00", "09:00", "07:00", "08:00")).toBe(false);
  });

  it("is false for disjoint ranges", () => {
    expect(rangesOverlap("08:00", "09:00", "10:00", "11:00")).toBe(false);
  });
});

describe("findConflicts", () => {
  it("returns only same-day overlapping courses, ignoring self", () => {
    const courses = makeCourses([
      { id: "a", day: "MON", startTime: "08:00", endTime: "09:00" },
      { id: "b", day: "MON", startTime: "08:30", endTime: "09:30" },
      { id: "c", day: "TUE", startTime: "08:00", endTime: "09:00" },
      { id: "d", day: "MON", startTime: "10:00", endTime: "11:00" },
    ]);
    const candidate = courses[0];
    const conflicts = findConflicts(courses, candidate);
    expect(conflicts.map((c) => c.id)).toEqual(["b"]);
  });
});

describe("findConflictPairs", () => {
  it("reports course-vs-course overlaps once per pair", () => {
    const courses = makeCourses([
      { id: "a", day: "MON", startTime: "08:00", endTime: "09:00" },
      { id: "b", day: "MON", startTime: "08:30", endTime: "09:30" },
    ]);
    const pairs = findConflictPairs(courses, []);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe("overlap");
    expect(pairs[0].overlapMinutes).toBe(30);
  });

  it("reports a course that collides with a scheduled break", () => {
    const courses = makeCourses([
      { id: "a", day: "MON", startTime: "09:10", endTime: "10:00" },
    ]);
    const breaks = [makeBreak({ startTime: "09:20", endTime: "09:40" })];
    const pairs = findConflictPairs(courses, breaks);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe("break");
  });

  it("returns nothing for a clean schedule", () => {
    const courses = makeCourses([
      { id: "a", day: "MON", startTime: "08:00", endTime: "09:00" },
      { id: "b", day: "MON", startTime: "09:00", endTime: "10:00" },
    ]);
    expect(findConflictPairs(courses, [])).toHaveLength(0);
  });
});

describe("findBestSectionFits", () => {
  it("marks the fewest-clash section of a subject as best", () => {
    // Fixed load: MON 08:00-09:00.
    // Surveying Sec A clashes with it; Sec B is free.
    const courses = makeCourses([
      { id: "fixed", code: "FIXED", title: "Fixed", day: "MON", startTime: "08:00", endTime: "09:00" },
      { id: "sa", code: "SURV", title: "Surveying", section: "A", day: "MON", startTime: "08:00", endTime: "09:00" },
      { id: "sb", code: "SURV", title: "Surveying", section: "B", day: "TUE", startTime: "08:00", endTime: "09:00" },
    ]);
    const fits = findBestSectionFits(courses, []);
    const keyA = courseGroupKey(courses[1]);
    const keyB = courseGroupKey(courses[2]);
    expect(fits.get(keyA)?.best).toBe(false);
    expect(fits.get(keyB)?.best).toBe(true);
    expect(fits.get(keyA)?.total).toBe(2);
  });

  it("ignores subjects with only one section", () => {
    const courses = makeCourses([{ id: "solo", code: "SOLO", title: "Solo" }]);
    expect(findBestSectionFits(courses, []).size).toBe(0);
  });
});

describe("layoutCourses", () => {
  it("assigns full width to a solitary course", () => {
    const courses = makeCourses([
      { id: "a", day: "MON", startTime: "08:00", endTime: "09:00" },
    ]);
    const laid = layoutCourses(courses, []);
    expect(laid).toHaveLength(1);
    expect(laid[0].widthPercent).toBe(100);
    expect(laid[0].leftOffsetPercent).toBe(0);
  });

  it("splits overlapping courses into side-by-side columns", () => {
    const courses = makeCourses([
      { id: "a", day: "MON", startTime: "08:00", endTime: "09:00" },
      { id: "b", day: "MON", startTime: "08:30", endTime: "09:30" },
    ]);
    const laid = layoutCourses(courses, []);
    expect(laid).toHaveLength(2);
    for (const c of laid) expect(c.widthPercent).toBeCloseTo(50);
    const lefts = laid.map((c) => c.leftOffsetPercent).sort();
    expect(lefts).toEqual([0, 50]);
  });

  it("flags a course that overlaps a break", () => {
    const courses = makeCourses([
      { id: "a", day: "MON", startTime: "09:10", endTime: "10:00" },
    ]);
    const laid = layoutCourses(courses, [
      { startTime: "09:20", endTime: "09:40" },
    ]);
    expect(laid[0].overlapsBreak).toBe(true);
  });
});
