import { describe, expect, it } from "vitest";
import {
  assignUniqueColors,
  courseGroupKey,
  subjectKey,
  getAutoColor,
  effectiveColor,
} from "./colors";
import { makeCourses } from "../test/fixtures";

describe("courseGroupKey / subjectKey", () => {
  it("prefers code over title and lowercases", () => {
    expect(courseGroupKey({ code: " MATH101 ", title: "Calculus" })).toBe("math101");
  });

  it("falls back to title when code is empty", () => {
    expect(courseGroupKey({ code: "", title: "Calculus" })).toBe("calculus");
  });

  it("distinguishes sections of the same subject in the group key", () => {
    const a = courseGroupKey({ code: "SURV", title: "Surveying", section: "A" });
    const b = courseGroupKey({ code: "SURV", title: "Surveying", section: "B" });
    expect(a).not.toBe(b);
  });

  it("subjectKey ignores the section", () => {
    const [a] = makeCourses([{ code: "SURV", title: "Surveying", section: "A" }]);
    const [b] = makeCourses([{ code: "SURV", title: "Surveying", section: "B" }]);
    expect(subjectKey(a)).toBe(subjectKey(b));
  });
});

describe("getAutoColor", () => {
  it("is deterministic for the same key", () => {
    expect(getAutoColor("math101")).toBe(getAutoColor("math101"));
  });
});

describe("effectiveColor", () => {
  it("prefers the manual override", () => {
    const [c] = makeCourses([{ colorOverride: "#123456" }]);
    expect(effectiveColor(c)).toBe("#123456");
  });

  it("auto-derives when there is no override", () => {
    const [c] = makeCourses([{ colorOverride: undefined, code: "CODE101" }]);
    expect(effectiveColor(c)).toBe(getAutoColor("code101"));
  });
});

describe("assignUniqueColors", () => {
  it("gives the same course the same color across days", () => {
    const incoming = makeCourses([
      { id: "a1", code: "MATH", title: "Math", day: "MON" },
      { id: "a2", code: "MATH", title: "Math", day: "WED" },
    ]);
    const out = assignUniqueColors(incoming, []);
    expect(out[0].colorOverride).toBe(out[1].colorOverride);
  });

  it("gives different courses different colors", () => {
    const incoming = makeCourses([
      { id: "a", code: "MATH", title: "Math" },
      { id: "b", code: "PHYS", title: "Physics" },
    ]);
    const out = assignUniqueColors(incoming, []);
    expect(out[0].colorOverride).not.toBe(out[1].colorOverride);
  });

  it("respects an existing manual override", () => {
    const incoming = makeCourses([{ id: "a", code: "MATH", colorOverride: "#abcdef" }]);
    const out = assignUniqueColors(incoming, []);
    expect(out[0].colorOverride).toBe("#abcdef");
  });

  it("avoids colors already used by existing courses", () => {
    const [existing] = makeCourses([{ id: "e", code: "PHYS", colorOverride: "#112233" }]);
    const incoming = makeCourses([{ id: "a", code: "MATH", title: "Math" }]);
    const out = assignUniqueColors(incoming, [existing]);
    expect(out[0].colorOverride).not.toBe("#112233");
  });
});
