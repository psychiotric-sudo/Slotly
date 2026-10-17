import { describe, expect, it } from "vitest";
import { parseGeminiJson } from "./gemini";

describe("parseGeminiJson", () => {
  it("parses a courses object and normalizes times/days", () => {
    const json = JSON.stringify({
      slotMinutes: 30,
      courses: [
        {
          title: "Calculus",
          code: "MATH101",
          day: "MON",
          startTime: "7:30",
          endTime: "9:00",
        },
      ],
      breaks: [{ label: "RECESS", startTime: "09:20", endTime: "09:40" }],
    });
    const result = parseGeminiJson(json);
    expect(result.slotMinutes).toBe(30);
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].startTime).toBe("07:30");
    expect(result.courses[0].day).toBe("MON");
    expect(result.breaks).toHaveLength(1);
    expect(result.breaks[0].label).toBe("RECESS");
  });

  it("strips markdown code fences around the JSON", () => {
    const fenced = "```json\n" +
      JSON.stringify({ courses: [{ title: "A", day: "TUE", startTime: "08:00", endTime: "09:00" }] }) +
      "\n```";
    const result = parseGeminiJson(fenced);
    expect(result.courses).toHaveLength(1);
  });

  it("accepts a bare array of courses", () => {
    const arr = JSON.stringify([
      { title: "A", day: "WED", startTime: "08:00", endTime: "09:00" },
    ]);
    expect(parseGeminiJson(arr).courses).toHaveLength(1);
  });

  it("expands multi-day tokens into one entry per day", () => {
    const json = JSON.stringify({
      courses: [
        { title: "Lab", day: "MWF", startTime: "10:00", endTime: "11:00" },
      ],
    });
    expect(parseGeminiJson(json).courses).toHaveLength(3);
  });

  it("skips invalid entries and dedupes exact repeats", () => {
    const json = JSON.stringify({
      courses: [
        { title: "Good", day: "MON", startTime: "08:00", endTime: "09:00" },
        { title: "Good", day: "MON", startTime: "08:00", endTime: "09:00" },
        { title: "Bad", day: "MON", startTime: "09:00", endTime: "08:00" },
        { title: "", day: "MON", startTime: "08:00", endTime: "09:00" },
      ],
    });
    expect(parseGeminiJson(json).courses).toHaveLength(1);
  });

  it("throws on non-JSON input", () => {
    expect(() => parseGeminiJson("not json at all")).toThrow();
  });

  it("throws when there are no valid courses", () => {
    expect(() => parseGeminiJson(JSON.stringify({ courses: [] }))).toThrow();
  });
});
