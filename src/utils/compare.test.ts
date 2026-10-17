import { describe, expect, it } from "vitest";
import {
  busyByDay,
  countClashes,
  freeWindows,
  groupFreeByDay,
  parseCompareJson,
} from "./compare";
import { makeCourses } from "../test/fixtures";

function compareJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    sectionA: {
      name: "Section A",
      slotMinutes: 30,
      courses: [
        {
          title: "Operating Systems",
          code: "CS301",
          day: "MON",
          startTime: "08:00",
          endTime: "10:00",
        },
        {
          title: "Operating Systems",
          code: "CS301",
          day: "WED",
          startTime: "08:00",
          endTime: "10:00",
        },
      ],
    },
    sectionB: {
      name: "Section B",
      slotMinutes: 30,
      courses: [
        {
          title: "Operating Systems",
          code: "CS301",
          day: "TUE",
          startTime: "13:00",
          endTime: "15:00",
        },
      ],
    },
    ...overrides,
  });
}

describe("parseCompareJson", () => {
  it("parses both sections from a fenced JSON block", async () => {
    const text = "```json\n" + compareJson() + "\n```";
    const result = parseCompareJson(text);
    expect(result.sectionA.name).toBe("Section A");
    expect(result.sectionA.courses).toHaveLength(2);
    expect(result.sectionB.name).toBe("Section B");
    expect(result.sectionB.courses).toHaveLength(1);
  });

  it("accepts snake_case section keys", () => {
    const result = parseCompareJson(
      JSON.stringify({
        section_a: { courses: [{ title: "Math", day: "MON", startTime: "08:00", endTime: "09:00" }] },
        section_b: { courses: [] },
      })
    );
    expect(result.sectionA.courses).toHaveLength(1);
    expect(result.sectionB.courses).toHaveLength(0);
  });

  it("falls back to default section names", () => {
    const result = parseCompareJson(
      JSON.stringify({
        sectionA: { courses: [{ title: "Math", day: "MON", startTime: "08:00", endTime: "09:00" }] },
      })
    );
    expect(result.sectionA.name).toBe("Section A");
    expect(result.sectionB.name).toBe("Section B");
    expect(result.sectionB.courses).toHaveLength(0);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCompareJson("not json at all")).toThrow(/valid JSON/);
  });

  it("throws when both sections are empty", () => {
    expect(() =>
      parseCompareJson(JSON.stringify({ sectionA: { courses: [] }, sectionB: { courses: [] } }))
    ).toThrow(/No classes found/);
  });
});

describe("busyByDay", () => {
  it("merges overlapping spans on the same day", () => {
    const busy = busyByDay(
      makeCourses([
        { day: "MON", startTime: "08:00", endTime: "10:00" },
        { day: "MON", startTime: "09:30", endTime: "11:00" },
        { day: "TUE", startTime: "08:00", endTime: "09:00" },
      ])
    );
    expect(busy.get("MON")).toEqual([{ startMin: 480, endMin: 660 }]);
    expect(busy.get("TUE")).toEqual([{ startMin: 480, endMin: 540 }]);
  });
});

describe("freeWindows", () => {
  it("finds gaps inside the day span", () => {
    const windows = freeWindows(
      makeCourses([{ day: "MON", startTime: "09:00", endTime: "11:00" }]),
      { startMin: 7 * 60, endMin: 12 * 60 }
    );
    expect(windows.filter((w) => w.day === "MON")).toEqual([
      { day: "MON", startMin: 420, endMin: 540 },
      { day: "MON", startMin: 660, endMin: 720 },
    ]);
  });

  it("drops windows shorter than the minimum", () => {
    const windows = freeWindows(
      makeCourses([
        { day: "MON", startTime: "08:00", endTime: "09:00" },
        { day: "MON", startTime: "09:25", endTime: "12:00" },
      ]),
      { startMin: 8 * 60, endMin: 12 * 60, minWindow: 30 }
    );
    expect(windows.filter((w) => w.day === "MON")).toHaveLength(0);
  });

  it("marks an empty day as free when other days have classes", () => {
    const windows = freeWindows(
      makeCourses([{ day: "MON", startTime: "08:00", endTime: "17:00" }]),
      { startMin: 8 * 60, endMin: 17 * 60 }
    );
    const tue = windows.filter((w) => w.day === "TUE" || w.day === "WED");
    expect(tue.length).toBeGreaterThan(0);
  });
});

describe("countClashes", () => {
  it("counts section meetings overlapping the user's classes", () => {
    const own = makeCourses([{ id: "o1", day: "MON", startTime: "09:00", endTime: "10:00" }]);
    const section = makeCourses([
      { id: "s1", day: "MON", startTime: "08:30", endTime: "09:30" },
      { id: "s2", day: "MON", startTime: "10:00", endTime: "11:00" },
      { id: "s3", day: "TUE", startTime: "09:00", endTime: "10:00" },
    ]);
    expect(countClashes(section, own)).toBe(1);
  });
});

describe("groupFreeByDay", () => {
  it("groups windows in weekday order, skipping empty days", () => {
    const grouped = groupFreeByDay([
      { day: "WED", startMin: 600, endMin: 700 },
      { day: "MON", startMin: 600, endMin: 700 },
    ]);
    expect(grouped.map((g) => g.day)).toEqual(["MON", "WED"]);
  });
});
