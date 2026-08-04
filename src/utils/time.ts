import type { WeekDay } from "../types";

export const SLOT_MINUTES = 30;
export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 17;

export const DAY_COLUMN_MAP: Record<WeekDay, number> = {
  MON: 2,
  TUE: 3,
  WED: 4,
  THU: 5,
  FRI: 6,
  SAT: 7,
  SUN: 8,
};

export const COLUMN_DAY_MAP: Record<number, WeekDay> = {
  2: "MON",
  3: "TUE",
  4: "WED",
  5: "THU",
  6: "FRI",
  7: "SAT",
  8: "SUN",
};

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToGridRow(time: string, startHour: number, slotMinutes: number): number {
  const startOffsetMinutes = startHour * 60;
  const relativeMinutes = timeToMinutes(time) - startOffsetMinutes;
  const slotIndex = relativeMinutes / slotMinutes;
  return slotIndex + 2;
}

export function getGridRowSpan(
  startTime: string,
  endTime: string,
  startHour: number,
  slotMinutes: number
): { gridRowStart: number; gridRowEnd: number } {
  const rowStart = timeToGridRow(startTime, startHour, slotMinutes);
  const rowEnd = timeToGridRow(endTime, startHour, slotMinutes);
  return { gridRowStart: rowStart, gridRowEnd: rowEnd };
}

export function minutesLabel(hour: number, minute: number): string {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${h}:${m}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** "HH:mm" (24h) → "7:30 AM" style display (12h). */
export function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
