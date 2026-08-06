import type { CourseEntry, ScheduleBreak, ScheduleSettings, ScheduleState, WeekDay } from "../types";

export const STORAGE_KEY = "schedule_v1";
export const SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS: ScheduleSettings = {
  startHour: 7,
  endHour: 17,
  slotMinutes: 30,
  activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
  theme: "light",
  fontSize: 12,
  sundayFirst: false,
  showConflictBadges: true,
  showBreaks: true,
  simplifyView: false,
  simplifyExport: false,
};

const WEEK_DAY_SET: ReadonlySet<string> = new Set([
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
]);

function isBreakEntry(value: unknown): value is ScheduleBreak {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.startTime === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v.startTime) &&
    typeof v.endTime === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v.endTime)
  );
}

function isCourseEntry(value: unknown): value is CourseEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.code === "string" &&
    typeof v.day === "string" &&
    WEEK_DAY_SET.has(v.day) &&
    typeof v.startTime === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v.startTime) &&
    typeof v.endTime === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v.endTime) &&
    typeof v.colorHex === "string" &&
    (v.colorOverride === undefined || typeof v.colorOverride === "string") &&
    typeof v.createdAt === "number"
  );
}

export function validateSchema(parsed: unknown): parsed is ScheduleState {
  if (typeof parsed !== "object" || parsed === null) return false;
  const p = parsed as Record<string, unknown>;
  if (typeof p.schemaVersion !== "number" || p.schemaVersion < 1 || p.schemaVersion > SCHEMA_VERSION) {
    return false;
  }
  if (!Array.isArray(p.courses)) return false;
  if (!p.courses.every(isCourseEntry)) return false;
  if (typeof p.settings !== "object" || p.settings === null) return false;
  return true;
}

function normalizeBreaks(value: unknown): ScheduleBreak[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isBreakEntry);
}

export function normalizeSettings(
  settings: Partial<ScheduleSettings> | undefined
): ScheduleSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!settings) return base;
  if (typeof settings.startHour === "number") base.startHour = settings.startHour;
  if (typeof settings.endHour === "number") base.endHour = settings.endHour;
  if (typeof settings.slotMinutes === "number" && settings.slotMinutes > 0) {
    base.slotMinutes = settings.slotMinutes;
  }
  if (Array.isArray(settings.activeDays)) {
    base.activeDays = settings.activeDays.filter((d): d is WeekDay =>
      WEEK_DAY_SET.has(d)
    );
  }
  if (settings.theme === "light" || settings.theme === "dark") {
    base.theme = settings.theme;
  }
  if (typeof settings.fontSize === "number" && settings.fontSize >= 10 && settings.fontSize <= 16) {
    base.fontSize = settings.fontSize;
  }
  if (typeof settings.sundayFirst === "boolean") {
    base.sundayFirst = settings.sundayFirst;
  }
  if (typeof settings.showConflictBadges === "boolean") {
    base.showConflictBadges = settings.showConflictBadges;
  }
  if (typeof settings.showBreaks === "boolean") {
    base.showBreaks = settings.showBreaks;
  }
  if (typeof settings.simplifyView === "boolean") {
    base.simplifyView = settings.simplifyView;
  }
  if (typeof settings.simplifyExport === "boolean") {
    base.simplifyExport = settings.simplifyExport;
  }
  return base;
}

export function saveState(state: Omit<ScheduleState, "schemaVersion" | "savedAt">): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        savedAt: Date.now(),
        courses: state.courses,
        breaks: state.breaks,
        settings: state.settings,
      })
    );
  } catch (err) {
    console.warn("Persistence failed:", err);
  }
}

export function loadState(): ScheduleState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!validateSchema(parsed)) return null;
    // Migration: pre-auto-color entries keep their stored color as a manual override.
    const courses = parsed.courses.map((c: CourseEntry) =>
      c.colorOverride === undefined ? { ...c, colorOverride: c.colorHex } : c
    );
    const breaks = normalizeBreaks(parsed.breaks);
    const settings =
      typeof parsed.schemaVersion === "number" && parsed.schemaVersion < 2
        ? { ...parsed.settings, simplifyView: false, simplifyExport: false }
        : parsed.settings;
    return { ...parsed, courses, breaks, settings } as ScheduleState;
  } catch {
    return null;
  }
}
