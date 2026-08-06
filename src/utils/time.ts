import type { CourseEntry, SlotMinutes, WeekDay } from "../types";

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

let measureCtx: CanvasRenderingContext2D | null = null;

/** Best-effort canvas width of text in the given font (falls back to estimate). */
export function measureTextWidth(text: string, font: string): number {
  try {
    if (!measureCtx) {
      measureCtx = document.createElement("canvas").getContext("2d");
    }
    if (!measureCtx) return estimateTextWidth(text);
    measureCtx.font = font;
    if ("letterSpacing" in measureCtx) (measureCtx as CanvasRenderingContext2D).letterSpacing = "0em";
    return measureCtx.measureText(text).width;
  } catch {
    return estimateTextWidth(text);
  }
}

/** Rough px estimate when canvas measuring is unavailable. */
export function estimateTextWidth(text: string, fontSize = 12): number {
  const narrow = /[iIl.,:;\s]/g;
  let w = 0;
  for (const ch of text) w += narrow.test(ch) ? 0.3 : 0.55;
  return w * fontSize;
}

/** "HH:mm" minutes → 12h label without the AM/PM suffix, e.g. 560 → "9:20". */
export function shortTimeLabel(minutes: number): string {
  return formatTime12(minutesToTime(minutes)).replace(/\s*[AP]M$/i, "");
}

/** One compressed grid row in the rendered table. */
export interface GridRowModel {
  startMin: number;
  endMin: number;
  occupied: boolean;
  /** Original slot indices this row covers (one for occupied rows, many for an empty band). */
  slots: number[];
}

/**
 * Compresses the day into the fewest display rows that stay faithful.
 * Every course/break edge becomes a boundary; between two consecutive
 * boundaries the coverage is constant, so:
 * - a fully-empty stretch collapses into ONE row (e.g. a long lunch gap);
 * - an occupied stretch ALSO collapses into ONE row per segment — a 2-hour
 *   class at 20-min granularity becomes a single row instead of six.
 * The only exception is a completely empty grid, which keeps every slot as its
 * own row so a blank schedule still shows the full start–end grid.
 * Returns rows plus a mapping from original slot index → row.
 */
export function buildGridRowModel(
  courses: Pick<CourseEntry, "day" | "startTime" | "endTime">[],
  breaks: { startTime: string; endTime: string }[],
  startHour: number,
  slotMinutes: number,
  totalSlots: number,
  simplify = true
): { rows: GridRowModel[]; slotToRow: number[] } {
  const startMin = startHour * 60;
  const occupied = new Array<boolean>(totalSlots).fill(false);
  const mark = (start: string, end: string) => {
    const s0 = Math.max(0, Math.floor((timeToMinutes(start) - startMin) / slotMinutes));
    const s1 = Math.min(totalSlots, Math.ceil((timeToMinutes(end) - startMin) / slotMinutes));
    for (let s = s0; s < s1; s++) occupied[s] = true;
  };
  for (const c of courses) mark(c.startTime, c.endTime);
  for (const b of breaks) mark(b.startTime, b.endTime);

  const rows: GridRowModel[] = [];
  const slotToRow: number[] = new Array(totalSlots).fill(0);

  // Full grid (not simplified): every slot gets its own row so course heights
  // stay exactly proportional to their real duration.
  if (!simplify) {
    for (let s = 0; s < totalSlots; s++) {
      slotToRow[s] = rows.length;
      rows.push({
        startMin: startMin + s * slotMinutes,
        endMin: startMin + (s + 1) * slotMinutes,
        occupied: true,
        slots: [s],
      });
    }
    return { rows, slotToRow };
  }

  if (!occupied.some(Boolean)) {
    for (let s = 0; s < totalSlots; s++) {
      slotToRow[s] = rows.length;
      rows.push({
        startMin: startMin + s * slotMinutes,
        endMin: startMin + (s + 1) * slotMinutes,
        occupied: true,
        slots: [s],
      });
    }
    return { rows, slotToRow };
  }

  const boundarySlots = new Set<number>([0, totalSlots]);
  const addRange = (start: string, end: string) => {
    boundarySlots.add(
      Math.max(0, Math.floor((timeToMinutes(start) - startMin) / slotMinutes))
    );
    boundarySlots.add(
      Math.min(totalSlots, Math.ceil((timeToMinutes(end) - startMin) / slotMinutes))
    );
  };
  for (const c of courses) addRange(c.startTime, c.endTime);
  for (const b of breaks) addRange(b.startTime, b.endTime);
  const bounds = Array.from(boundarySlots).sort((a, b) => a - b);

  for (let i = 0; i < bounds.length - 1; i++) {
    const s0 = bounds[i];
    if (s0 >= bounds[i + 1]) continue;
    const occ = occupied[s0];

    if (!occ) {
      let j = i;
      while (j + 1 < bounds.length && !occupied[bounds[j + 1]]) j++;
      const endSlot = bounds[j + 1] ?? totalSlots;
      const rowIndex = rows.length;
      for (let s = s0; s < endSlot; s++) slotToRow[s] = rowIndex;
      rows.push({
        startMin: startMin + s0 * slotMinutes,
        endMin: startMin + endSlot * slotMinutes,
        occupied: false,
        slots: Array.from({ length: endSlot - s0 }, (_, k) => s0 + k),
      });
      i = j;
      continue;
    }

    const s1 = bounds[i + 1];
    const rowIndex = rows.length;
    for (let s = s0; s < s1; s++) slotToRow[s] = rowIndex;
    rows.push({
      startMin: startMin + s0 * slotMinutes,
      endMin: startMin + s1 * slotMinutes,
      occupied: true,
      slots: Array.from({ length: s1 - s0 }, (_, k) => s0 + k),
    });
  }
  return { rows, slotToRow };
}

/** Time range label for a merged empty row, e.g. "9:20 – 11:00". */
export function bandTimeLabel(row: GridRowModel): string {
  return `${shortTimeLabel(row.startMin)} – ${shortTimeLabel(row.endMin)}`;
}

export interface FittedBlock {
  fontSize: number;
  lines: string[];
  /** Number of leading lines that are the emphasized (bold) title. */
  boldCount: number;
}

export interface FitOptions {
  /** Word-wrap over-long lines into multiple visual lines instead of ellipsizing. */
  wrap?: boolean;
  /** Always emitted as the final rendered line (e.g. the time) and never dropped. */
  keepLast?: string;
  /** Font weight used to measure/draw the first content line (the title). */
  titleWeight?: string;
  /** Font weight used to measure/draw the remaining lines. */
  bodyWeight?: string;
}

/** Splits a single line into visual lines, word-wrapping so each fits maxW. */
export function wrapTextToWidth(text: string, maxW: number, font: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: string[] = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const trial = cur + " " + words[i];
    if (measureTextWidth(trial, font) <= maxW) {
      cur = trial;
    } else {
      out.push(cur);
      cur = words[i];
    }
  }
  out.push(cur);
  return out;
}

/**
 * Picks a font size and the longest prefix of `lines` that physically fit
 * inside a block of the given width/height, so text auto-fits the box (e.g. a
 * compressed single-row block doesn't overflow). Longer lines still ellipsize
 * unless `wrap` is set, in which case they are word-wrapped instead.
 *
 * Lines are measured with the weight they will actually be drawn at — the first
 * content line (the title) with `titleWeight`, the rest with `bodyWeight` — so
 * a bold title is wrapped/ellipsized using bold metrics and never overflows.
 */
export function fitBlockContent(
  lines: string[],
  blockWidth: number,
  blockHeight: number,
  baseFontSize: number,
  fontFamily: string,
  minFontSize = 8,
  lineHeight = 1.3,
  options: FitOptions = {}
): FittedBlock {
  const { wrap = false, keepLast, titleWeight = "500", bodyWeight = "500" } = options;
  const padX = 8;
  const padY = 6;
  const maxW = Math.max(30, blockWidth - padX * 2);
  const maxH = Math.max(14, blockHeight - padY * 2);
  const content = keepLast != null ? lines.filter((l) => l !== keepLast) : lines;

  const measure = (text: string, f: number, w: string): number =>
    measureTextWidth(text, `${w} ${f}px ${fontFamily}`);

  const wrapAt = (text: string, f: number, w: string): string[] =>
    wrap ? wrapTextToWidth(text, maxW, `${w} ${f}px ${fontFamily}`) : [text];

  const build = (f: number): { visual: string[]; weights: string[]; bold: number } => {
    const visual: string[] = [];
    const weights: string[] = [];
    let bold = 0;
    content.forEach((l, idx) => {
      const w = idx === 0 ? titleWeight : bodyWeight;
      const wrapped = wrapAt(l, f, w);
      for (const seg of wrapped) {
        visual.push(seg);
        weights.push(w);
      }
      if (idx === 0) bold = wrapped.length;
    });
    if (keepLast != null) {
      visual.push(keepLast);
      weights.push(bodyWeight);
    }
    return { visual, weights, bold };
  };

  let font = Math.max(minFontSize, baseFontSize);
  while (true) {
    const built = build(font);
    let longest = 0;
    built.visual.forEach((l, i) => {
      longest = Math.max(longest, measure(l, font, built.weights[i]));
    });
    const fitsHeight = font * lineHeight * built.visual.length <= maxH + 0.5;
    if (longest <= maxW && fitsHeight) return { fontSize: font, lines: built.visual, boldCount: built.bold };
    // Never drop below the floor: if the text can't fit at the minimum size,
    // fall through to the floor path below. This guarantee means the loop
    // always terminates (it cannot get stuck at minFontSize).
    if (font <= minFontSize) break;
    font = Math.max(minFontSize, font - 0.5);
  }

  // Floor: keep `keepLast` (e.g. the time) and as many leading content lines
  // as fit vertically, shrinking the font to the minimum. Trailing lines are
  // dropped before the protected last line.
  const f = minFontSize;
  const maxLines = Math.max(1, Math.floor(maxH / (f * lineHeight)));
  const keepCount = keepLast != null ? Math.max(0, maxLines - 1) : maxLines;
  const visual: string[] = [];
  const weights: string[] = [];
  let bold = 0;
  for (let i = 0; i < content.length; i++) {
    const w = i === 0 ? titleWeight : bodyWeight;
    const wrapped = wrapAt(content[i], f, w);
    if (wrapped.length > keepCount || visual.length + wrapped.length > keepCount) break;
    visual.push(...wrapped);
    weights.push(...wrapped.map(() => w));
    if (i === 0) bold = wrapped.length;
  }
  if (keepLast != null && visual.length < maxLines) {
    visual.push(keepLast);
    weights.push(bodyWeight);
  }
  const linesOut = visual.length > 0 ? visual : keepLast != null ? [keepLast] : [];
  return { fontSize: f, lines: linesOut, boldCount: bold };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Infers the natural grid granularity from the class times themselves.
 * The slot is the largest whole minute step that every start and end time is
 * a multiple of — e.g. times on :00/:30 → 30, :00/:20/:40 → 20, :00 only → 60,
 * times at :00/:15 → 15. Falls back to `fallback` when times don't agree.
 */
export function detectSlotMinutes(
  courses: Pick<CourseEntry, "startTime" | "endTime">[],
  fallback: SlotMinutes = 30
): SlotMinutes {
  if (courses.length === 0) return fallback;
  let g = 0;
  for (const c of courses) {
    g = gcd(g, timeToMinutes(c.startTime));
    g = gcd(g, timeToMinutes(c.endTime));
  }
  if (g === 0) return fallback;
  const caps: SlotMinutes[] = [240, 180, 120, 90, 60, 45, 30, 20, 15, 10, 5];
  for (const cap of caps) {
    if (g % cap === 0) return cap;
  }
  return fallback;
}
