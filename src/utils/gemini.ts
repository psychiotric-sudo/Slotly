import type { CourseEntry, WeekDay } from "../types";

export const GEMINI_PROMPT = `You are converting a class schedule into JSON for the Slotly timetable app.

Look at the schedule in the image/text and extract every class meeting. Output your answer as a markdown code block tagged \`json\` containing ONLY valid JSON — no extra text, no explanations — in this exact shape:

{
  "courses": [
    {
      "title": "Full course title",
      "code": "Course code if shown, otherwise the course title",
      "instructor": "Instructor name if shown, otherwise empty string",
      "room": "Room or building if shown, otherwise empty string",
      "day": "MON|TUE|WED|THU|FRI|SAT|SUN",
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  ]
}

Rules:
- Use 24-hour times, e.g. "07:30" for 7:30 AM and "13:00" for 1:00 PM.
- If a class meets on multiple days (e.g. "TTh", "MWF", "Mon & Wed", "Tue/Thu"), output ONE object per day, each with the SAME title and code.
- "day" must be exactly one of: MON, TUE, WED, THU, FRI, SAT, SUN.
- If the schedule is a photo, read the times and days exactly as printed on it.
- Include every class. Do not invent or skip any.
- Put the JSON inside a markdown code block like \`\`\`json ... \`\`\`. The JSON must be valid — it will be parsed programmatically.`;

const DAY_ALIASES: Record<string, WeekDay> = {
  MON: "MON", MONDAY: "MON",
  TUE: "TUE", TUES: "TUE", TUESDAY: "TUE",
  WED: "WED", WEDS: "WED", WEDNESDAY: "WED", W: "WED", WEDNES: "WED",
  THU: "THU", TH: "THU", THURS: "THU", THURSDAY: "THU", THR: "THU",
  FRI: "FRI", FRIDAY: "FRI",
  SAT: "SAT", SATURDAY: "SAT",
  SUN: "SUN", SUNDAY: "SUN",
};

function expandDays(raw: string): WeekDay[] {
  const cleaned = raw.trim().toUpperCase();
  const expanded: WeekDay[] = [];
  if (DAY_ALIASES[cleaned]) return [DAY_ALIASES[cleaned]];

  // Try compact multi-day tokens: MWF, TTH, MTWTHF...
  const tokens: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch === "T" || ch === "TH") {
      if (i + 1 < cleaned.length && cleaned[i + 1] === "H") {
        tokens.push("THU");
        i += 2;
      } else {
        tokens.push("TUE");
        i += 1;
      }
    } else if (ch === "W") {
      tokens.push("WED");
      i += 1;
    } else if (ch === "M") {
      tokens.push("MON");
      i += 1;
    } else if (ch === "F") {
      tokens.push("FRI");
      i += 1;
    } else if (ch === "S") {
      // SA or SU
      if (i + 1 < cleaned.length && cleaned[i + 1] === "A") {
        tokens.push("SAT");
        i += 2;
      } else if (i + 1 < cleaned.length && cleaned[i + 1] === "U") {
        tokens.push("SUN");
        i += 2;
      } else {
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  for (const t of tokens) {
    const day = DAY_ALIASES[t];
    if (day && !expanded.includes(day)) expanded.push(day);
  }
  return expanded;
}

function normalizeTime(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

interface RawCourse {
  title?: string;
  code?: string;
  instructor?: string;
  room?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
}

/** Parses Gemini output (object with `courses` array, or a bare array). */
export function parseGeminiJson(text: string): CourseEntry[] {
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

  const rawCourses: RawCourse[] = Array.isArray(parsed)
    ? (parsed as RawCourse[])
    : Array.isArray((parsed as { courses?: unknown }).courses)
      ? ((parsed as { courses: RawCourse[] }).courses)
      : [];

  if (rawCourses.length === 0) {
    throw new Error("No courses found in that JSON. Make sure it contains a \"courses\" array.");
  }

  const now = Date.now();
  const entries: CourseEntry[] = [];
  let n = 0;
  const seen = new Set<string>();

  for (const raw of rawCourses) {
    if (!raw || typeof raw !== "object") continue;
    const title = (raw.title ?? "").trim();
    const dayRaw = raw.day ?? "";
    const days = expandDays(dayRaw);
    const start = normalizeTime(raw.startTime ?? "");
    const end = normalizeTime(raw.endTime ?? "");

    if (!title || days.length === 0 || !start || !end) continue;
    if (end <= start) continue;

    for (const day of days) {
      const key = `${title}|${day}|${start}|${end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      n += 1;
      entries.push({
        id: crypto.randomUUID(),
        title,
        code: (raw.code ?? "").trim() || title,
        instructor: (raw.instructor ?? "").trim(),
        room: (raw.room ?? "").trim(),
        day,
        startTime: start,
        endTime: end,
        colorHex: "#93C5FD",
        createdAt: now + n,
      });
    }
  }

  if (entries.length === 0) {
    throw new Error(
      "Could not read any valid classes. Check that each item has title, day (MON–SUN), and times."
    );
  }

  return entries;
}
