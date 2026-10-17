import { describe, expect, it } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  validTime,
  formatTime12,
  detectSlotMinutes,
  clamp,
} from "./time";
import { makeCourses } from "../test/fixtures";

describe("timeToMinutes / minutesToTime", () => {
  it("parses HH:mm into minutes past midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("07:30")).toBe(450);
    expect(timeToMinutes("23:59")).toBe(23 * 60 + 59);
  });

  it("round-trips minute values back to HH:mm", () => {
    expect(minutesToTime(450)).toBe("07:30");
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(23 * 60 + 59)).toBe("23:59");
  });

  it("is the inverse of minutesToTime for slot-aligned values", () => {
    for (const m of [0, 30, 450, 720, 1020]) {
      expect(timeToMinutes(minutesToTime(m))).toBe(m);
    }
  });
});

describe("validTime", () => {
  it("accepts well-formed 24-hour times", () => {
    expect(validTime("07:30")).toBe(true);
    expect(validTime("23:59")).toBe(true);
    expect(validTime("00:00")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(validTime("")).toBe(false);
    expect(validTime("7:30")).toBe(false);
    expect(validTime("24:00")).toBe(false);
    expect(validTime("12:60")).toBe(false);
    expect(validTime("abc")).toBe(false);
  });
});

describe("formatTime12", () => {
  it("formats morning times without a period suffix change", () => {
    expect(formatTime12("07:30")).toContain("7:30");
    expect(formatTime12("07:30").toLowerCase()).toContain("am");
  });

  it("formats afternoon/evening times as pm", () => {
    expect(formatTime12("13:00").toLowerCase()).toContain("1:00");
    expect(formatTime12("13:00").toLowerCase()).toContain("pm");
  });
});

describe("detectSlotMinutes", () => {
  it("prefers an explicit valid slotMinutes", () => {
    expect(detectSlotMinutes(makeCourses([]), 45)).toBe(45);
  });

  it("falls back to a detected GCD of start times when none given", () => {
    const courses = makeCourses([
      { startTime: "07:00", endTime: "08:00" },
      { startTime: "08:30", endTime: "09:30" },
      { startTime: "10:00", endTime: "11:00" },
    ]);
    const detected = detectSlotMinutes(courses, undefined);
    expect([15, 30, 60]).toContain(detected);
  });

  it("returns a sane default when there are no courses", () => {
    expect(detectSlotMinutes([], undefined)).toBe(30);
  });
});

describe("clamp", () => {
  it("clamps into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
