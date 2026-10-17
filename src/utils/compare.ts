import type { CourseEntry, SlotMinutes, WeekDay } from "../types";
import { parseGeminiJson } from "./gemini";
import { timeToMinutes } from "./time";

/**
 * Prompt for the two-section comparison flow: the user photographs TWO
 * section schedules, Gemini reads both, and Slotly shows vacant windows and
 * clashes against whatever is already in the planner.
 */
export const COMPARE_PROMPT = `You are comparing TWO college section schedules for the Slotly timetable app.

The user attached photos of TWO different sections — for example Section A and Section B of the same subject, or two sections of a major they are choosing between. Read BOTH photos separately.

Output your answer as a markdown code block tagged \`json\` containing ONLY valid JSON — no extra text, no explanations — in this exact shape:

{
  "sectionA": {
    "name": "Section A",
    "slotMinutes": 30,
    "courses": [
      {
        "title": "Full course title",
        "code": "Course code if SHOWN clearly, otherwise empty string. Do NOT invent codes.",
        "instructor": "Instructor name if shown, otherwise empty string",
        "room": "Room or building if shown, otherwise empty string",
        "day": "MON|TUE|WED|THU|FRI|SAT|SUN",
        "startTime": "HH:MM",
        "endTime": "HH:MM"
      }
    ]
  },
  "sectionB": {
    "name": "Section B",
    "slotMinutes": 30,
    "courses": []
  }
}

Rules:
- The FIRST photo is "sectionA". The SECOND photo is "sectionB".
- Use 24-hour times, e.g. "07:30" for 7:30 AM and "13:00" for 1:00 PM.
- If a class meets on multiple days (e.g. "TTh", "MWF", "Mon & Wed"), output ONE object per day, each with the SAME title and code.
- "day" must be exactly one of: MON, TUE, WED, THU, FRI, SAT, SUN.
- If a class is listed without a clear time, skip it rather than guessing.
- Only set "code" when a code is actually printed on the schedule; otherwise empty string.
- If only one photo was attached, put everything in "sectionA" and leave "sectionB" courses empty.
- If either section's schedule is text-only (a list of classes and times, not a grid), read it the same way.
- Put the JSON inside a markdown code block like \`\`\`json ... \`\`\`. The JSON must be valid — it will be parsed programmatically.`;

export interface SectionSchedule {
  name: string;
  slotMinutes: SlotMinutes;
  courses: CourseEntry[];
}

export interface CompareResult {
  sectionA: SectionSchedule;
  sectionB: SectionSchedule;
}

function sectionFrom(raw: unknown, fallbackName: string): SectionSchedule {
  const empty: SectionSchedule = { name: fallbackName, slotMinutes: 30, courses: [] };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const obj = raw as { name?: unknown; slotMinutes?: unknown; courses?: unknown };
  const name =
    typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : fallbackName;
  if (!Array.isArray(obj.courses)) return { ...empty, name };
  try {
    const parsed = parseGeminiJson(
      JSON.stringify({
        courses: obj.courses,
        breaks: [],
        slotMinutes: obj.slotMinutes,
      })
    );
    return { name, slotMinutes: parsed.slotMinutes, courses: parsed.courses };
  } catch {
    return { ...empty, name };
  }
}

/** Parses the two-section JSON Gemini returns for COMPARE_PROMPT. */
export function parseCompareJson(text: string): CompareResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("That doesn't look like valid JSON. Copy the exact JSON Gemini returned.");
  }

  const obj =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  const rawA = obj?.sectionA ?? obj?.section_a ?? obj?.A;
  const rawB = obj?.sectionB ?? obj?.section_b ?? obj?.B;

  const sectionA = sectionFrom(rawA, "Section A");
  const sectionB = sectionFrom(rawB, "Section B");

  if (sectionA.courses.length === 0 && sectionB.courses.length === 0) {
    throw new Error(
      "No classes found in either section. Check that each section has a \"courses\" array."
    );
  }
  return { sectionA, sectionB };
}

export interface BusySpan {
  startMin: number;
  endMin: number;
}

/** Busy time spans per day, merged and sorted. */
export function busyByDay(courses: CourseEntry[]): Map<WeekDay, BusySpan[]> {
  const byDay = new Map<WeekDay, BusySpan[]>();
  for (const c of courses) {
    const start = timeToMinutes(c.startTime);
    const end = timeToMinutes(c.endTime);
    if (end <= start) continue;
    const list = byDay.get(c.day) ?? [];
    list.push({ startMin: start, endMin: end });
    byDay.set(c.day, list);
  }
  const out = new Map<WeekDay, BusySpan[]>();
  for (const [day, spans] of byDay) {
    const sorted = [...spans].sort((a, b) => a.startMin - b.startMin);
    const merged: BusySpan[] = [];
    for (const span of sorted) {
      const last = merged[merged.length - 1];
      if (last && span.startMin <= last.endMin) {
        last.endMin = Math.max(last.endMin, span.endMin);
      } else {
        merged.push({ ...span });
      }
    }
    out.set(day, merged);
  }
  return out;
}

export interface FreeWindow {
  day: WeekDay;
  startMin: number;
  endMin: number;
}

const DAY_ORDER: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/**
 * Free windows for a section: gaps of at least `minWindow` minutes inside the
 * section's own day span (clamped to DEFAULT_FREE_START/END).
 */
export const DEFAULT_FREE_START = 7 * 60;
export const DEFAULT_FREE_END = 20 * 60;
const MIN_WINDOW = 30;

export function freeWindows(
  courses: CourseEntry[],
  opts: { startMin?: number; endMin?: number; minWindow?: number } = {}
): FreeWindow[] {
  const startBound = opts.startMin ?? DEFAULT_FREE_START;
  const endBound = opts.endMin ?? DEFAULT_FREE_END;
  const minWindow = opts.minWindow ?? MIN_WINDOW;
  const busy = busyByDay(courses);
  const out: FreeWindow[] = [];

  for (const day of DAY_ORDER) {
    const spans = busy.get(day) ?? [];
    let cursor = startBound;
    for (const span of spans) {
      if (span.startMin > cursor + minWindow) {
        out.push({ day, startMin: cursor, endMin: Math.min(span.startMin, endBound) });
      }
      cursor = Math.max(cursor, span.endMin);
    }
    if (endBound > cursor + minWindow) {
      out.push({ day, startMin: cursor, endMin: endBound });
    }
  }
  return out.filter((w) => w.endMin > w.startMin);
}

/** Number of section meetings that overlap any class in `own`. */
export function countClashes(section: CourseEntry[], own: CourseEntry[]): number {
  let count = 0;
  for (const s of section) {
    const sStart = timeToMinutes(s.startTime);
    const sEnd = timeToMinutes(s.endTime);
    const clash = own.some(
      (o) =>
        o.day === s.day &&
        timeToMinutes(o.startTime) < sEnd &&
        sStart < timeToMinutes(o.endTime)
    );
    if (clash) count += 1;
  }
  return count;
}

/** Day-grouped free windows for display: [{ day, windows: [{startMin,endMin}] }] */
export function groupFreeByDay(windows: FreeWindow[]): Array<{
  day: WeekDay;
  windows: BusySpan[];
}> {
  const byDay = new Map<WeekDay, BusySpan[]>();
  for (const w of windows) {
    const list = byDay.get(w.day) ?? [];
    list.push({ startMin: w.startMin, endMin: w.endMin });
    byDay.set(w.day, list);
  }
  return DAY_ORDER.filter((d) => byDay.has(d)).map((day) => ({
    day,
    windows: byDay.get(day)!,
  }));
}
