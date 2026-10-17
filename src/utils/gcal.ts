import type { CourseEntry, WeekDay } from "../types";
import { newId } from "./id";

const ICS_DAY_TO_WEEKDAY: Record<string, WeekDay> = {
  MO: "MON",
  TU: "TUE",
  WE: "WED",
  TH: "THU",
  FR: "FRI",
  SA: "SAT",
  SU: "SUN",
};

const WEEKDAY_TO_ICS: Record<WeekDay, string> = {
  MON: "MO",
  TUE: "TU",
  WED: "WE",
  THU: "TH",
  FRI: "FR",
  SAT: "SA",
  SUN: "SU",
};

interface ParsedEvent {
  summary: string;
  location?: string;
  description?: string;
  start: { hours: number; minutes: number };
  end: { hours: number; minutes: number };
  days: WeekDay[];
  recurring: boolean;
}

function unfoldIcs(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    if (raw.startsWith(" ") || raw.startsWith("\t")) {
      current += raw.slice(1);
    } else {
      if (current) lines.push(current);
      current = raw;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function parseDateTime(value: string): { hours: number; minutes: number } {
  // value like "20260113T073000" (local) or "20260113T073000Z" (UTC)
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return { hours: 0, minutes: 0 };
  let hours = Number(match[4]);
  const minutes = Number(match[5]);
  if (value.endsWith("Z")) {
    // Convert UTC to browser-local wall time so the class shows at the right local hour.
    const utc = Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      hours,
      minutes
    );
    const local = new Date(utc);
    hours = local.getHours();
  }
  return { hours, minutes };
}

function extractEvents(text: string): ParsedEvent[] {
  const lines = unfoldIcs(text);
  const events: ParsedEvent[] = [];
  let current: Record<string, string> | null = null;

  const flush = () => {
    if (!current) return;
    const dtstart = current["DTSTART"] ?? "";
    const dtend = current["DTEND"] ?? "";
    const rrule = current["RRULE"] ?? "";

    if (current["RECURRENCE-ID"]) return; // skip exceptions/overrides
    if (!/^\d{8}T\d{6}/.test(dtstart)) return; // skip all-day / date-only events

    const ruleParts = Object.fromEntries(
      rrule.split(";").filter(Boolean).map((part) => {
        const idx = part.indexOf("=");
        return [part.slice(0, idx), part.slice(idx + 1)];
      })
    );

    const freq = ruleParts["FREQ"];
    const byDay = (ruleParts["BYDAY"] ?? "")
      .split(",")
      .map((d) => ICS_DAY_TO_WEEKDAY[d.trim()])
      .filter((d): d is WeekDay => Boolean(d));

    // Only weekly recurring classes with explicit days are schedule entries.
    if (freq && freq !== "WEEKLY") return;
    if (byDay.length === 0) return;

    const start = parseDateTime(dtstart);
    const end = parseDateTime(dtend);

    events.push({
      summary: unescapeIcsText(current["SUMMARY"] ?? "Untitled class"),
      location: unescapeIcsText(current["LOCATION"] ?? ""),
      description: current["DESCRIPTION"],
      start,
      end,
      days: byDay,
      recurring: true,
    });
    current = null;
  };

  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toUpperCase();
    const baseKey = key.split(";")[0];
    const value = line.slice(colon + 1);
    if (key === "BEGIN" && value === "VEVENT") {
      current = {};
    } else if (key === "END" && value === "VEVENT") {
      flush();
      current = null;
    } else if (current) {
      current[baseKey] = value;
    }
  }
  flush();

  return events;
}

const pad = (n: number) => String(n).padStart(2, "0");

function unescapeIcsText(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export function parseIcs(text: string): CourseEntry[] {
  const now = Date.now();
  const events = extractEvents(text);
  const entries: CourseEntry[] = [];
  let n = 0;

  for (const event of events) {
    for (const day of event.days) {
      n += 1;
      entries.push({
        id: newId(),
        title: event.summary,
        code: event.summary,
        instructor: "",
        room: event.location ?? "",
        day,
        startTime: `${pad(event.start.hours)}:${pad(event.start.minutes)}`,
        endTime: `${pad(event.end.hours)}:${pad(event.end.minutes)}`,
        colorHex: "#93C5FD",
        createdAt: now + n,
      });
    }
  }

  return entries;
}

/** Next calendar date (YYYYMMDD) for a given weekday, starting today. */
function nextDateForWeekday(day: WeekDay): string {
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].indexOf(day);
  const today = new Date();
  const diff = (dow - today.getDay() + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function courseKey(course: CourseEntry): string {
  const base = (course.code || course.title).trim().toLowerCase();
  const section = (course.section ?? "").trim().toLowerCase();
  return section ? `${base}#${section}` : base;
}

export interface CourseGroup {
  key: string;
  code: string;
  title: string;
  section: string;
  name: string;
  days: WeekDay[];
  startTime: string;
  endTime: string;
  room: string;
}

export function groupCourses(courses: CourseEntry[]): CourseGroup[] {
  const order: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const map = new Map<string, CourseGroup>();
  for (const course of courses) {
    const key = courseKey(course);
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        code: course.code,
        title: course.title,
        section: course.section ?? "",
        name: course.code || course.title,
        days: [],
        startTime: course.startTime,
        endTime: course.endTime,
        room: course.room,
      };
      map.set(key, group);
    }
    if (!group.days.includes(course.day)) group.days.push(course.day);
    group.days.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  return Array.from(map.values());
}

/** Google Calendar event title: "courseCode - courseTitle" and nothing else. */
function gcalEventName(group: CourseGroup): string {
  const code = (group.code ?? "").trim();
  const title = (group.title ?? "").trim();
  const section = (group.section ?? "").trim();
  const name = title || code;
  const labelled = section ? `${name} (Sec ${section})` : name;
  if (code && title && code !== title) return `${code} - ${labelled}`;
  return labelled;
}

function buildRrule(group: CourseGroup): string {
  const byDay = group.days.map((d) => WEEKDAY_TO_ICS[d]).join(",");
  return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${byDay}`;
}

/**
 * Converts a wall-clock time on a given date (browser-local timezone) into an
 * unambiguous UTC ICS timestamp (`...Z`). Google Calendar otherwise treats
 * timezone-less "floating" times inconsistently and shifts the blocks.
 */
function localToUtcIcs(dateStr: string, time: string): string {
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
  const [h, m] = time.split(":").map(Number);
  const local = new Date(
    Number(match?.[1]),
    Number(match?.[2]) - 1,
    Number(match?.[3]),
    h,
    m,
    0,
    0
  );
  const utc = new Date(local.getTime());
  return `${pad(utc.getUTCFullYear())}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

/** Google Calendar "add event" template URL for a recurring course. */
export function buildGcalAddUrl(group: CourseGroup): string {
  const date = nextDateForWeekday(group.days[0]);
  const start = localToUtcIcs(date, group.startTime);
  const end = localToUtcIcs(date, group.endTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: gcalEventName(group),
    dates: `${start}/${end}`,
    recur: `RRULE:${buildRrule(group)}`,
  });
  if (group.room) params.set("location", group.room);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Builds an .ics file that re-creates the schedule as weekly recurring events. */
export function buildIcs(courses: CourseEntry[]): string {
  const groups = groupCourses(courses);
  const tz =
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "") || "UTC";
  const now = new Date();
  const nowStamp = `${pad(now.getUTCFullYear())}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slotly//Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Slotly Schedule",
    `X-WR-TIMEZONE:${tz}`,
  ];

  for (const group of groups) {
    const date = nextDateForWeekday(group.days[0]);
    const start = localToUtcIcs(date, group.startTime);
    const end = localToUtcIcs(date, group.endTime);
    const uid = `slotly-${group.key.replace(/\s+/g, "-").slice(0, 40)}@slotly.app`;
    lines.push(
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `DTSTAMP:${nowStamp}`,
      `RRULE:${buildRrule(group)}`,
      `SUMMARY:${escapeIcsText(gcalEventName(group))}`,
      group.room ? `LOCATION:${escapeIcsText(group.room)}` : "",
      `UID:${uid}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter((l) => l !== "").join("\r\n");
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export const GOOGLE_CALENDAR_EXPORT_URL =
  "https://calendar.google.com/calendar/u/2/r/settings/export";
export const GEMINI_URL = "https://gemini.google.com/app";

/**
 * Opens the installed Google Gemini app when available, otherwise falls back to
 * opening the Gemini web app in the browser. On Android it uses an intent with a
 * fallback to Play Store; on iOS it tries the app scheme then the App Store.
 */
export function openGeminiApp(): void {
  const userAgent =
  navigator.userAgent ||
  navigator.vendor ||
  ((window as { opera?: string }).opera ?? "");

  if (/android/i.test(userAgent)) {
    window.location.href =
      "intent://open#Intent;" +
      "scheme=googleapp;" +
      "package=com.google.android.apps.bard;" +
      "S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.google.android.apps.bard;" +
      "end";
  } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as { MSStream?: unknown }).MSStream) {
    const now = Date.now();
    window.location.href = "googleapp://";
    setTimeout(() => {
      if (Date.now() - now < 2000) {
        window.open("https://apps.apple.com/us/app/google-gemini/id1583097472", "_blank");
      }
    }, 1500);
  } else {
    window.open(GEMINI_URL, "_blank", "noopener,noreferrer");
  }
}
