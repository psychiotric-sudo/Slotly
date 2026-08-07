import type { CourseEntry, ExportTheme, ScheduleBreak, SlotMinutes, WeekDay } from "../types";
import { DAY_LABELS } from "../types";
import type { GridRowModel } from "../utils/time";
import { bandTimeLabel, buildGridRowModel, fitBlockContent, formatTime12, measureTextWidth, timeToMinutes } from "../utils/time";
import { darkenHex, effectiveColor } from "../utils/colors";
import { getAccessibleTextColor } from "../utils/contrast";
import { layoutCourses, rangesOverlap } from "../utils/conflicts";
import { DEFAULT_EXPORT_THEME } from "../utils/exportTheme";

const EXPORT_SCALE = 1.25;

/** Base cell proportions — scaled so the timetable fills the whole page. */
const GUTTER = 76;
const HEADER_H = 34;
const ROW_H = 34;
const COL_W = 150;

const PDF_MARGIN = 10; // mm of white around the table on each side of the page
const PDF_PADDING = 14; // px bottom frame that also holds the site watermark
const JPG_PADDING = 24; // px of white frame around the JPG image

/** Current site origin (host only, e.g. "slotly-timetable.vercel.app" or "localhost:5173"). */
const SITE_URL = window.location.host;
const A4: Record<"portrait" | "landscape", { w: number; h: number }> = {
  portrait: { w: 210, h: 297 },
  landscape: { w: 297, h: 210 },
};

export interface ExportTableData {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  activeDays: WeekDay[];
  startHour: number;
  endHour: number;
  slotMinutes: SlotMinutes;
  showBreaks: boolean;
  simplifyExport: boolean;
  /** Class/section/year title, shown above the table (teacher mode). */
  title?: string;
  /** Colors for the printable timetable (time column + day header row). */
  theme?: ExportTheme;
}

const DAY_ORDER: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface GridGeometry {
  gut: number;
  colW: number;
  headerH: number;
  rowH: number;
  width: number;
  height: number;
  rows: GridRowModel[];
}

/**
 * Days shown in the export: always Monday–Friday (even if empty), plus any
 * weekend day that actually has a class.
 */
function exportDaysOf(data: ExportTableData): WeekDay[] {
  const weekdaySet = new Set<WeekDay>(["MON", "TUE", "WED", "THU", "FRI"]);
  const scheduled = new Set<WeekDay>(data.courses.map((c) => c.day));
  const extra = data.activeDays.filter((d) => !weekdaySet.has(d) && scheduled.has(d));
  const ordered: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", ...extra];
  return ordered.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

/**
 * Works out cell sizes so the rendered grid has exactly the same aspect ratio
 * as the printable page area. Instead of shrinking the table to fit inside the
 * paper (leaving white gutters), it expands the cells until the timetable
 * fills the whole page edge to edge.
 */
function computeGeometry(data: ExportTableData): GridGeometry {
  const days = exportDaysOf(data);
  const { start, totalSlots } = effectiveRange(
    data.courses,
    data.breaks,
    data.startHour,
    data.endHour,
    data.slotMinutes
  );
  const { rows } = buildGridRowModel(
    data.courses,
    data.breaks,
    start,
    data.slotMinutes,
    totalSlots,
    data.simplifyExport
  );
  const rowsCount = rows.length;

  let autoGut = GUTTER;
  for (const row of rows) {
    // Measure each label with the exact font it is drawn in. The +24 leaves
    // room for the right inset (label is drawn at gut-12, truncated at gut-24)
    // so the widest label always fits — Excel-style autofit for the column.
    const label = bandTimeLabel(row);
    const font = row.occupied ? `700 11px ${FONT}` : `italic 500 11px ${FONT}`;
    autoGut = Math.max(autoGut, Math.ceil(measureTextWidth(label, font)) + 24);
  }

  const baseW = autoGut + days.length * COL_W;
  const baseH = HEADER_H + rowsCount * ROW_H;

  const page = A4[baseW >= baseH ? "landscape" : "portrait"];
  const usableW = page.w - PDF_MARGIN * 2;
  const usableH = page.h - PDF_MARGIN * 2;
  const targetAspect = usableW / usableH;
  const aspect = baseW / baseH;

  let gut = autoGut;
  let colW = COL_W;
  let headerH = HEADER_H;
  let rowH = ROW_H;

  if (aspect < targetAspect) {
    const f = (targetAspect * baseH) / baseW;
    gut *= f;
    colW *= f;
  } else {
    const g = baseW / (targetAspect * baseH);
    headerH *= g;
    rowH *= g;
  }

  return {
    gut,
    colW,
    headerH,
    rowH,
    width: gut + days.length * colW,
    height: headerH + rowsCount * rowH,
    rows,
  };
}

const FONT = 'Inter, Arial, Helvetica, "Segoe UI", sans-serif';

/** Yields to the browser so React can paint the latest progress value. */
const nextPaint = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Fills a rectangle with a solid colour. */
function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Strokes a 1px rectangle, inset by half a pixel so the line stays crisp. */
function strokeCell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Draws text, optionally truncating with an ellipsis when it would exceed maxWidth. */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
  ellipsis = true
): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  let out = text;
  if (ellipsis && maxWidth > 0 && ctx.measureText(out).width > maxWidth) {
    while (out.length > 1 && ctx.measureText(out + "…").width > maxWidth) {
      out = out.slice(0, -1);
    }
    out += "…";
  }
  ctx.fillText(out, x, y);
}

/**
 * Draws the timetable directly onto a <canvas> with the 2D API. Rendering is
 * fast and does not block the main thread (unlike html2canvas, which rasterizes
 * synchronously and freezes the tab), so real progress can be reported at each
 * phase and the UI stays responsive while the export is prepared.
 */
async function renderTableCanvas(
  data: ExportTableData,
  geometry: GridGeometry,
  padding = 0,
  onProgress?: (pct: number) => void
): Promise<HTMLCanvasElement> {
  onProgress?.(4);
  // Wait for webfonts so text metrics are final, but never let a slow font
  // load freeze the export — bail after 600ms if fonts aren't ready.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]);
  onProgress?.(8);

  const theme = data.theme ?? DEFAULT_EXPORT_THEME;

  const { courses, breaks = [], showBreaks = true } = data;
  const days = exportDaysOf(data);
  const { gut, colW, headerH, rowH, rows } = geometry;
  const dayCount = days.length;
  const width = geometry.width;
  const height = geometry.height;

  // Clamp the rendered resolution. A full (non-simplified) grid makes one row
  // per slot, and the page-fill scaling can swell the canvas to tens of
  // millions of pixels; the synchronous JPEG encode of that would block the
  // main thread and freeze the tab. Bound the total pixels (and each side)
  // so the encode always stays fast, while keeping proportions intact.
  const logicalW = width + padding * 2;
  const title = (data.title ?? "").trim();
  const titlePad = title ? 38 : 0;
  const logicalH = height + padding * 2 + titlePad;
  const MAX_PIXELS = 6_500_000;
  const MAX_DIM = 8192;
  const scale = Math.min(
    EXPORT_SCALE,
    MAX_DIM / logicalW,
    MAX_DIM / logicalH,
    Math.sqrt(MAX_PIXELS / (logicalW * logicalH))
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(logicalW * scale));
  canvas.height = Math.max(1, Math.ceil(logicalH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not supported in this browser.");

  ctx.scale(scale, scale);
  ctx.translate(padding, padding);
  // When a class title is set, push the table down so the title sits in its own
  // white band above the grid (still inside the outer frame).
  const topOffset = titlePad;
  ctx.translate(0, topOffset);

  // White base fills the whole export frame (including the padding gutter and
  // the title band above the grid — otherwise the title area is transparent
  // and JPG fills it black).
  fillRect(
    ctx,
    -padding,
    -padding - titlePad,
    width + padding * 2,
    height + padding * 2 + titlePad,
    "#ffffff"
  );

  // Outer frame.
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#b0b0b0";
  ctx.strokeRect(1.5, 1.5 - titlePad, width - 3, height + titlePad - 3);

  // Class/section title (teacher mode).
  if (title) {
    drawText(ctx, title, width / 2, -titlePad / 2, width - 60, `700 ${titlePad / 2}px ${FONT}`, "#111827", "center");
  }

  // Corner cell ("Time").
  fillRect(ctx, 0, 0, gut, headerH, theme.dayBg);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#90a488";
  ctx.strokeRect(0, 0, gut, headerH);
  drawText(ctx, "Time", 12, headerH / 2, gut - 24, `700 13px ${FONT}`, theme.dayText, "left");

  // Day headers.
  for (let i = 0; i < dayCount; i++) {
    const x = gut + i * colW;
    fillRect(ctx, x, 0, colW, headerH, theme.dayBg);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#90a488";
    ctx.strokeRect(x + 0.5, 0.5, colW - 1, headerH - 1);
    drawText(ctx, DAY_LABELS[days[i]].toUpperCase(), x + colW / 2, headerH / 2, colW - 8, `700 12px ${FONT}`, theme.dayText, "center");
  }
  onProgress?.(16);
  await nextPaint();

  // Row cells (time column + day grid, or the merged FREE TIME row).
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const top = headerH + r * rowH;
    const isMerged = !row.occupied;
    // Free time after the last class is left blank (no FREE TIME band).
    const isTrailingFree = isMerged && r === rows.length - 1;

    if (isTrailingFree) {
      fillRect(ctx, 0, top, gut, rowH, theme.timeBg);
      strokeCell(ctx, 0, top, gut, rowH, "#d9c276");
      drawText(ctx, bandTimeLabel(row), gut - 12, top + rowH / 2, gut - 24, `700 11px ${FONT}`, theme.timeText, "right", false);
      for (let i = 0; i < dayCount; i++) {
        const x = gut + i * colW;
        fillRect(ctx, x, top, colW, rowH, "#ffffff");
        strokeCell(ctx, x, top, colW, rowH, theme.gridLine);
      }
      if (r % 4 === 3) {
        onProgress?.(16 + Math.round(((r + 1) / rows.length) * 26));
        await nextPaint();
      }
      continue;
    }

    fillRect(ctx, 0, top, gut, rowH, isMerged ? "#f6f2ea" : theme.timeBg);
    strokeCell(ctx, 0, top, gut, rowH, isMerged ? "#e0d7c6" : "#d9c276");
    drawText(
      ctx,
      bandTimeLabel(row),
      gut - 12,
      top + rowH / 2,
      gut - 24,
      isMerged ? `italic 500 11px ${FONT}` : `700 11px ${FONT}`,
      isMerged ? "#8a8177" : theme.timeText,
      "right",
      false
    );

    if (isMerged) {
      fillRect(ctx, gut, top, dayCount * colW, rowH, "#f6f2ea");
      strokeCell(ctx, gut, top, dayCount * colW, rowH, theme.gridLine);
      drawText(
        ctx,
        "FREE TIME",
        gut + (dayCount * colW) / 2,
        top + rowH / 2,
        dayCount * colW - 16,
        `italic 500 11px ${FONT}`,
        "#8a8177",
        "center"
      );
    } else {
      for (let i = 0; i < dayCount; i++) {
        const x = gut + i * colW;
        fillRect(ctx, x, top, colW, rowH, "#ffffff");
        strokeCell(ctx, x, top, colW, rowH, theme.gridLine);
      }
    }

    if (r % 4 === 3) {
      onProgress?.(16 + Math.round(((r + 1) / rows.length) * 26));
      await nextPaint();
    }
  }
  onProgress?.(42);
  await nextPaint();

  const minuteToY = (min: number): number => {
    let acc = headerH;
    for (const row of rows) {
      if (min <= row.endMin) {
        const span = row.endMin - row.startMin;
        return span > 0 ? acc + ((min - row.startMin) / span) * rowH : acc;
      }
      acc += rowH;
    }
    return acc;
  };

  // Break strips.
  if (showBreaks) {
    breaks
      .filter((b) => timeToMinutes(b.endTime) > timeToMinutes(b.startTime))
      .forEach((br) => {
        const yTop = minuteToY(timeToMinutes(br.startTime));
        const yBottom = minuteToY(timeToMinutes(br.endTime));
        const bh = Math.max(2, yBottom - yTop);
        fillRect(ctx, gut, yTop, dayCount * colW, bh, "#f3f3f4");
        strokeCell(ctx, gut, yTop, dayCount * colW, bh, "#d9c276");
        drawText(
          ctx,
          br.label,
          gut + (dayCount * colW) / 2,
          yTop + bh / 2,
          dayCount * colW - 16,
          `italic 500 12px ${FONT}`,
          "#5a5a5a",
          "center"
        );
      });
  }
  onProgress?.(58);
  await nextPaint();

  // Course blocks.
  const conflictIds = findConflictingIds(courses, breaks);
  const laidOut = layoutCourses(courses);
  const visible = laidOut.filter((c) => days.includes(c.day));
  for (let i = 0; i < visible.length; i++) {
    const course = visible[i];
    const dayIndex = days.indexOf(course.day);
    const yTop = minuteToY(timeToMinutes(course.startTime));
    const yBottom = minuteToY(timeToMinutes(course.endTime));
    const color = effectiveColor(course);
    const textColor = getAccessibleTextColor(color);
    const conflicting = conflictIds.has(course.id);
    const blockWidth = (course.widthPercent / 100) * colW;
    const blockHeight = Math.max(2, yBottom - yTop);
    const x = gut + dayIndex * colW + (course.leftOffsetPercent / 100) * colW;
    const timeLine = `${formatTime12(course.startTime).replace(/\s*[AP]M$/i, "")}–${formatTime12(
      course.endTime
    ).replace(/\s*[AP]M$/i, "")}`;
    const codeLabel = course.section ? `${course.code} · ${course.section}` : course.code;
    const fit = fitBlockContent(
      [
        course.title || codeLabel,
        ...(course.title && course.code ? [codeLabel] : []),
        ...(course.room || course.instructor
          ? [[course.instructor, course.room].filter(Boolean).join(" · ")]
          : []),
      ],
      blockWidth,
      blockHeight,
      12,
      "Inter",
      8,
      1.3,
      { wrap: true, keepLast: timeLine, titleWeight: "700", bodyWeight: "400" }
    );

    fillRect(ctx, x, yTop, blockWidth, blockHeight, color);
    ctx.lineWidth = 1;
    ctx.strokeStyle = conflicting ? "#ef4444" : darkenHex(color, 0.12);
    ctx.strokeRect(x + 0.5, yTop + 0.5, blockWidth - 1, blockHeight - 1);

    const padX = 8;
    const padY = 6;
    const maxTextW = blockWidth - padX * 2;
    const lineH = Math.round(fit.fontSize * 1.3);
    const lastY = yTop + blockHeight - padY - lineH / 2;
    let lineY = yTop + padY + lineH / 2;
    fit.lines.forEach((line, li) => {
      if (lineY > lastY) return;
      const isTime = /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}$/.test(line);
      drawText(
        ctx,
        line,
        x + padX,
        lineY,
        maxTextW,
        `${li < fit.boldCount ? "700" : "400"} ${fit.fontSize}px ${FONT}`,
        textColor,
        "left",
        !isTime
      );
      lineY += lineH;
    });

    if (i % 2 === 1) {
      onProgress?.(Math.min(88, 58 + Math.round(((i + 1) / visible.length) * 30)));
      await nextPaint();
    }
  }
  onProgress?.(88);
  await nextPaint();

  // Watermark in the outer frame (bottom-left), like the old DOM export.
  if (padding > 0) {
    drawText(ctx, SITE_URL, 12 - padding, height + padding - 6, width, `400 10px ${FONT}`, "#9ca3af", "left");
  }

  return canvas;
}

export async function exportToJPG(
  data: ExportTableData,
  filename = "schedule.jpg",
  onProgress?: (pct: number) => void
): Promise<void> {
  const geometry = computeGeometry(data);
  onProgress?.(3);
  const canvas = await renderTableCanvas(data, geometry, JPG_PADDING, onProgress);
  onProgress?.(90);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );
  if (!blob) throw new Error("Could not encode the schedule image.");
  onProgress?.(97);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  onProgress?.(100);
}

export async function exportToPDF(
  data: ExportTableData,
  filename = "schedule.pdf",
  onProgress?: (pct: number) => void
): Promise<void> {
  const geometry = computeGeometry(data);
  onProgress?.(3);
  // jsPDF is large (~390 kB), so only load it for actual PDF exports. JPG
  // exports never touch it. Start the fetch before rendering so it happens in
  // parallel with the draw and adds no extra wall-clock time.
  const jspdfPromise = import("jspdf");
  const canvas = await renderTableCanvas(data, geometry, PDF_PADDING, onProgress);
  onProgress?.(90);
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  onProgress?.(95);
  const { jsPDF } = await jspdfPromise;

  const page = A4[geometry.width >= geometry.height ? "landscape" : "portrait"];

  const pdf = new jsPDF({
    orientation: geometry.width >= geometry.height ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const renderWidth = page.w - PDF_MARGIN * 2;
  const renderHeight = page.h - PDF_MARGIN * 2;

  pdf.addImage(imgData, "JPEG", PDF_MARGIN, PDF_MARGIN, renderWidth, renderHeight);
  pdf.save(filename);
  onProgress?.(100);
}

/** Ids of every course that overlaps another course or a scheduled break. */
function findConflictingIds(
  courses: CourseEntry[],
  breaks: ScheduleBreak[] = []
): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i];
      const b = courses[j];
      if (a.day !== b.day) continue;
      if (rangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        result.add(a.id);
        result.add(b.id);
      }
    }
  }
  for (const course of courses) {
    if (
      breaks.some((b) =>
        rangesOverlap(course.startTime, course.endTime, b.startTime, b.endTime)
      )
    ) {
      result.add(course.id);
    }
  }
  return result;
}

/** Rows/columns that fully cover every course (same rule as the on-screen grid). */
function effectiveRange(
  courses: CourseEntry[],
  breaks: ScheduleBreak[],
  startHour: number,
  endHour: number,
  slotMinutes: number
): { start: number; endMinutes: number; totalSlots: number } {
  let earliest = Infinity;
  let latest = -Infinity;
  for (const c of courses) {
    earliest = Math.min(earliest, timeToMinutes(c.startTime));
    latest = Math.max(latest, timeToMinutes(c.endTime));
  }
  for (const b of breaks) {
    earliest = Math.min(earliest, timeToMinutes(b.startTime));
    latest = Math.max(latest, timeToMinutes(b.endTime));
  }
  const courseStartHour = courses.length || breaks.length ? Math.floor(earliest / 60) : startHour;
  const courseEndRounded =
    courses.length || breaks.length ? Math.ceil(latest / slotMinutes) * slotMinutes : -Infinity;
  const start = courseStartHour < startHour ? 0 : startHour;
  const endMinutes = Math.max(endHour * 60, courseEndRounded);
  return { start, endMinutes, totalSlots: (endMinutes - start * 60) / slotMinutes };
}
