import type { CourseEntry, ScheduleBreak, WeekDay } from "../types";

export function makeCourse(overrides: Partial<CourseEntry> = {}): CourseEntry {
  return {
    id: "c1",
    title: "Course",
    code: "CODE101",
    instructor: "",
    room: "",
    day: "MON",
    startTime: "07:30",
    endTime: "09:00",
    colorHex: "#89b4f0",
    createdAt: 1,
    ...overrides,
  };
}

export function makeCourses(
  specs: Array<Partial<CourseEntry>>
): CourseEntry[] {
  return specs.map((spec, i) =>
    makeCourse({ id: `c${i}`, createdAt: i + 1, ...spec })
  );
}

export function makeBreak(overrides: Partial<ScheduleBreak> = {}): ScheduleBreak {
  return {
    id: "b1",
    label: "RECESS",
    startTime: "09:20",
    endTime: "09:40",
    ...overrides,
  };
}

export const DAY: WeekDay = "MON";
