export type WeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const WEEK_DAYS: WeekDay[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

export const DAY_LABELS: Record<WeekDay, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

export const DAY_SHORT: Record<WeekDay, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export type Theme = "light" | "dark";

/** Grid granularity in minutes (e.g. 15, 20, 30, 60, 90…). */
export type SlotMinutes = number;

/** A full-width row (spans every day column) like RECESS or LUNCH BREAK. */
export interface ScheduleBreak {
  id: string;
  label: string;
  startTime: string; // "HH:mm" 24hr
  endTime: string; // "HH:mm" 24hr
}

export interface CourseEntry {
  id: string;
  title: string;
  code: string;
  instructor: string;
  room: string;
  /** Optional section/lab group (e.g. "A", "B"). Distinguishes alternative schedules of the same subject. */
  section?: string;
  day: WeekDay;
  startTime: string; // "HH:mm" 24hr
  endTime: string; // "HH:mm" 24hr
  colorHex: string;
  /** Manual color override. When absent, the color is auto-derived from the course identity (code/title). */
  colorOverride?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ScheduleSettings {
  startHour: number;
  endHour: number;
  slotMinutes: SlotMinutes;
  activeDays: WeekDay[];
  theme: Theme;
  fontSize: number;
  sundayFirst: boolean;
  showConflictBadges: boolean;
  showBreaks: boolean;
  /** Merge gaps/long blocks into single rows on the on-screen grid. */
  simplifyView: boolean;
  /** Merge gaps/long blocks into single rows when exporting. */
  simplifyExport: boolean;
}

export interface ScheduleState {
  schemaVersion: number;
  savedAt: number;
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  settings: ScheduleSettings;
}

/** Result of the Add/Edit modal: one study load scheduled across N days. */
export interface CourseFormResult {
  base: Omit<CourseEntry, "id" | "day" | "createdAt" | "updatedAt">;
  days: WeekDay[];
  /** Identity of the course being edited, so its existing blocks get replaced. */
  editingKey: string | null;
}
