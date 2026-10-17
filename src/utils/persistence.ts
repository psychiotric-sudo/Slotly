import type {
  CourseEntry,
  ScheduleBreak,
  ScheduleSettings,
  TeacherTab,
  WeekDay,
  WorkspaceState,
} from "../types";
import { DEFAULT_EXPORT_THEME, normalizeExportTheme } from "./exportTheme";

export const STORAGE_KEY = "schedule_v1";
export const SCHEMA_VERSION = 4;

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
  fitAllDays: false,
  exportTheme: { ...DEFAULT_EXPORT_THEME },
  teacherMode: false,
  classLabel: "",
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
  if (typeof settings.fitAllDays === "boolean") {
    base.fitAllDays = settings.fitAllDays;
  }
  base.exportTheme = normalizeExportTheme(settings.exportTheme);
  if (typeof settings.teacherMode === "boolean") {
    base.teacherMode = settings.teacherMode;
  }
  if (typeof settings.classLabel === "string") {
    base.classLabel = settings.classLabel;
  }
  return base;
}

function isTabEntry(value: unknown): value is TeacherTab {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    Array.isArray(v.courses) &&
    v.courses.every(isCourseEntry) &&
    Array.isArray(v.breaks) &&
    v.breaks.every(isBreakEntry)
  );
}

function migrateCourses(courses: CourseEntry[]): CourseEntry[] {
  // Migration: pre-auto-color entries keep their stored color as a manual override.
  return courses.map((c) =>
    c.colorOverride === undefined ? { ...c, colorOverride: c.colorHex } : c
  );
}

export function saveState(state: {
  settings: ScheduleSettings;
  tabs: TeacherTab[];
  activeId: string | null;
}): boolean {
  try {
    const body: WorkspaceState = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: Date.now(),
      settings: state.settings,
      tabs: state.tabs,
      activeId: state.activeId ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
    return true;
  } catch (err) {
    console.warn("Persistence failed:", err);
    return false;
  }
}

/**
 * Parses a stored/backup workspace string (v1–v3 single schedule or v4
 * multi-tab workspace). Returns null when the payload is unreadable.
 */
function parseWorkspace(raw: string): WorkspaceState | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Legacy v1–v3 single-schedule shape.
    if (Array.isArray(parsed.courses)) {
      const settings = parsed.settings as Partial<ScheduleSettings> | undefined;
      const normalized =
        typeof parsed.schemaVersion === "number" && parsed.schemaVersion < 2
          ? normalizeSettings({
              ...settings,
              simplifyView: false,
              simplifyExport: false,
              fitAllDays: false,
            })
          : normalizeSettings(settings);
      const tab: TeacherTab = {
        id: "tab-solo",
        name: (normalized.classLabel || "My Schedule").trim(),
        courses: migrateCourses(parsed.courses as CourseEntry[]),
        breaks: Array.isArray(parsed.breaks)
          ? (parsed.breaks as ScheduleBreak[])
          : [],
      };
      return {
        schemaVersion: SCHEMA_VERSION,
        savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
        settings: normalized,
        tabs: [tab],
        activeId: tab.id,
      };
    }

    // v4 workspace shape.
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return null;
    const tabs: TeacherTab[] = parsed.tabs.filter(isTabEntry).map((t) => ({
      ...t,
      courses: migrateCourses(t.courses),
    }));
    if (tabs.length === 0) return null;
    const activeId =
      typeof parsed.activeId === "string" &&
      tabs.some((t) => t.id === parsed.activeId)
        ? parsed.activeId
        : tabs[0].id;
    return {
      schemaVersion: SCHEMA_VERSION,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      settings: normalizeSettings(
        (parsed.settings as Partial<ScheduleSettings> | undefined) ?? {}
      ),
      tabs,
      activeId,
    };
  } catch {
    return null;
  }
}

/**
 * Loads the workspace. Handles the v1–v3 legacy shape (a single `courses`/
 * `breaks` schedule) by migrating it into a workspace with one tab, so existing
 * users keep their schedule untouched. Never throws (storage may be blocked).
 */
export function loadState(): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseWorkspace(raw);
  } catch {
    return null;
  }
}

/** A parsed backup file, reduced to what restoring actually needs. */
export interface RestoredBackup {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  settings: ScheduleSettings;
  tabName: string;
}

/**
 * Parses a JSON backup produced by Slotly (any schema version) for the restore
 * flow. Returns null when the payload is not a recognizable schedule.
 */
export function parseBackup(raw: string): RestoredBackup | null {
  const ws = parseWorkspace(raw);
  if (!ws) return null;
  const tab = ws.tabs.find((t) => t.id === ws.activeId) ?? ws.tabs[0];
  return {
    courses: tab.courses,
    breaks: tab.breaks,
    settings: ws.settings,
    tabName: tab.name,
  };
}
