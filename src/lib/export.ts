import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { CourseEntry, WeekDay } from "../types";
import { DAY_LABELS } from "../types";
import { formatTime12, measureTextWidth, timeToMinutes } from "../utils/time";
import { darkenHex, effectiveColor } from "../utils/colors";
import { getAccessibleTextColor } from "../utils/contrast";
import { layoutCourses, rangesOverlap } from "../utils/conflicts";

const EXPORT_SCALE = 2;
const EXPORT_WIDTH = 1800;

const TIME_BG = "#FDE68A";
const TIME_TEXT = "#78350F";
const DAY_BG = "#C8E6C9";
const DAY_TEXT = "#1B5E20";
const GRID_LINE = "#d9d9d9";

/** Base cell proportions — scaled so the timetable fills the whole page. */
const GUTTER = 76;
const HEADER_H = 34;
const ROW_H = 34;
const COL_W = 150;

const PDF_MARGIN = 10; // mm of white around the table on each side of the page
const PDF_PADDING = 3; // px frame so html2canvas doesn't clip the grid's outer border
const JPG_PADDING = 24; // px of white frame around the JPG image
const A4: Record<"portrait" | "landscape", { w: number; h: number }> = {
  portrait: { w: 210, h: 297 },
  landscape: { w: 297, h: 210 },
};

export interface ExportTableData {
  courses: CourseEntry[];
  activeDays: WeekDay[];
  startHour: number;
  endHour: number;
  slotMinutes: 15 | 30;
}

const DAY_ORDER: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface GridGeometry {
  gut: number;
  colW: number;
  headerH: number;
  rowH: number;
  width: number;
  height: number;
}

function exportDaysOf(data: ExportTableData): WeekDay[] {
  return [...data.activeDays]
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .filter((d) => data.courses.some((c) => c.day === d));
}

/**
 * Works out cell sizes so the rendered grid has exactly the same aspect ratio
 * as the printable page area. Instead of shrinking the table to fit inside the
 * paper (leaving white gutters), it expands the cells until the timetable
 * fills the whole page edge to edge.
 */
function computeGeometry(data: ExportTableData): GridGeometry {
  const days = exportDaysOf(data);
  const { start, slots } = effectiveRange(
    data.courses,
    data.startHour,
    data.endHour,
    data.slotMinutes
  );

  let autoGut = GUTTER;
  for (let s = 0; s < slots; s++) {
    const label = timeIntervalLabel(s, start, data.slotMinutes);
    autoGut = Math.max(autoGut, Math.ceil(measureTextWidth(label, "700 11px Inter")) + 16);
  }

  const baseW = autoGut + days.length * COL_W;
  const baseH = HEADER_H + slots * ROW_H;

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
    height: headerH + slots * rowH,
  };
}

interface TableLine {
  text: string;
  strong: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timeIntervalLabel(slotIndex: number, startHour: number, slotMinutes: number): string {
  const startMin = startHour * 60 + slotIndex * slotMinutes;
  const endMin = startMin + slotMinutes;
  const start = formatTime12(`${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`).replace(
    /\s*[AP]M$/i,
    ""
  );
  const end = formatTime12(`${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`).replace(
    /\s*[AP]M$/i,
    ""
  );
  return `${start}–${end}`;
}

/** Rows/columns that fully cover every course (same rule as the on-screen grid). */
function effectiveRange(
  courses: CourseEntry[],
  startHour: number,
  endHour: number,
  slotMinutes: number
): { start: number; endMinutes: number; slots: number } {
  let earliest = Infinity;
  let latest = -Infinity;
  for (const c of courses) {
    earliest = Math.min(earliest, timeToMinutes(c.startTime));
    latest = Math.max(latest, timeToMinutes(c.endTime));
  }
  const courseStartHour = courses.length ? Math.floor(earliest / 60) : startHour;
  const courseEndRounded =
    courses.length > 0 ? Math.ceil(latest / slotMinutes) * slotMinutes : -Infinity;
  const start = courseStartHour < startHour ? 0 : startHour;
  const endMinutes = Math.max(endHour * 60, courseEndRounded + slotMinutes);
  return { start, endMinutes, slots: (endMinutes - start * 60) / slotMinutes };
}

function appendLines(container: HTMLElement, lines: TableLine[]): void {
  lines.forEach((line, i) => {
    const last = i === lines.length - 1;
    if (line.text === "") return;
    const span = document.createElement("span");
    span.textContent = line.text;
    if (line.strong) span.style.fontWeight = "700";
    container.appendChild(span);
    if (!last) container.appendChild(document.createElement("br"));
  });
}

/** Ids of every course that shares its day/time range with another course. */
function findConflictingIds(courses: CourseEntry[]): Set<string> {
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
  return result;
}

/**
 * Renders the timetable as a spreadsheet-style grid of absolutely-positioned
 * boxes. Plain divs + px coordinates render reliably in html2canvas — unlike
 * <table> rowSpans, which html2canvas mis-renders and drops columns for.
 */
function buildExportGrid(
  data: ExportTableData,
  geometry: GridGeometry
): HTMLDivElement {
  const { courses, slotMinutes } = data;
  const days = exportDaysOf(data);
  const { start, slots } = effectiveRange(
    courses,
    data.startHour,
    data.endHour,
    slotMinutes
  );
  const { gut, colW, headerH, rowH } = geometry;
  const conflictIds = findConflictingIds(courses);
  const laidOut = layoutCourses(courses);

  const width = geometry.width;
  const height = geometry.height;

  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "relative",
    width: `${width}px`,
    height: `${height}px`,
    background: "#ffffff",
    fontFamily: 'Inter, Arial, Helvetica, "Segoe UI", sans-serif',
    fontSize: "11px",
    color: "#111111",
    boxSizing: "border-box",
  });

  const corner = document.createElement("div");
  corner.textContent = "Time";
  Object.assign(corner.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${gut}px`,
    height: `${headerH}px`,
    lineHeight: `${headerH}px`,
    paddingLeft: "12px",
    background: DAY_BG,
    color: DAY_TEXT,
    fontWeight: "700",
    borderLeft: "2px solid #90a488",
    borderTop: "2px solid #90a488",
    borderRight: "2px solid #90a488",
    borderBottom: "2px solid #90a488",
    boxSizing: "border-box",
  });
  root.appendChild(corner);

  for (let i = 0; i < days.length; i++) {
    const th = document.createElement("div");
    th.textContent = DAY_LABELS[days[i]];
    Object.assign(th.style, {
      position: "absolute",
      left: `${gut + i * colW}px`,
      top: "0",
      width: `${colW}px`,
      height: `${headerH}px`,
      lineHeight: `${headerH}px`,
      textAlign: "center",
      background: DAY_BG,
      color: DAY_TEXT,
      fontWeight: "700",
      fontSize: "12px",
      borderRight: "1px solid #90a488",
      borderBottom: "1px solid #90a488",
      boxSizing: "border-box",
    });
    root.appendChild(th);
  }

  for (let s = 0; s < slots; s++) {
    const top = headerH + s * rowH;

    const timeCell = document.createElement("div");
    timeCell.textContent = timeIntervalLabel(s, start, slotMinutes);
    Object.assign(timeCell.style, {
      position: "absolute",
      left: "0",
      top: `${top}px`,
      width: `${gut}px`,
      height: `${rowH}px`,
      lineHeight: `${rowH}px`,
      textAlign: "right",
      paddingRight: "12px",
      background: TIME_BG,
      color: TIME_TEXT,
      fontWeight: "700",
      borderRight: "1px solid #d9c276",
      borderBottom: "1px solid #d9c276",
      boxSizing: "border-box",
      whiteSpace: "nowrap",
      fontVariantNumeric: "tabular-nums",
    });
    root.appendChild(timeCell);

    for (let i = 0; i < days.length; i++) {
      const cell = document.createElement("div");
      Object.assign(cell.style, {
        position: "absolute",
        left: `${gut + i * colW}px`,
        top: `${top}px`,
        width: `${colW}px`,
        height: `${rowH}px`,
        background: "#ffffff",
        borderRight: `1px solid ${GRID_LINE}`,
        borderBottom: `1px solid ${GRID_LINE}`,
        boxSizing: "border-box",
      });
      root.appendChild(cell);
    }
  }

  laidOut
    .filter((c) => days.includes(c.day))
    .forEach((course) => {
      const dayIndex = days.indexOf(course.day);
      const startSlot = (timeToMinutes(course.startTime) - start * 60) / slotMinutes;
      const endSlot = (timeToMinutes(course.endTime) - start * 60) / slotMinutes;
      const span = Math.max(1, Math.round(endSlot - startSlot));
      const color = effectiveColor(course);
      const textColor = getAccessibleTextColor(color);
      const conflicting = conflictIds.has(course.id);

      const block = document.createElement("div");
      Object.assign(block.style, {
        position: "absolute",
        left: `${gut + dayIndex * colW + (course.leftOffsetPercent / 100) * colW}px`,
        top: `${headerH + startSlot * rowH}px`,
        width: `${(course.widthPercent / 100) * colW}px`,
        height: `${span * rowH}px`,
        background: color,
        color: textColor,
        border: conflicting
          ? "1px solid #ef4444"
          : `1px solid ${darkenHex(color, 0.45)}`,
        padding: "6px 8px",
        boxSizing: "border-box",
        overflow: "hidden",
      });
      appendLines(block, [
        { text: course.title || course.code, strong: true },
        ...(course.title && course.code
          ? [{ text: course.code, strong: false }]
          : []),
        {
          text: `${formatTime12(course.startTime).replace(/\s*[AP]M$/i, "")}–${formatTime12(course.endTime).replace(/\s*[AP]M$/i, "")}`,
          strong: false,
        },
        ...(course.room ? [{ text: course.room, strong: false }] : []),
      ]);
      root.appendChild(block);
    });

  return root;
}

async function renderTableToCanvas(
  data: ExportTableData,
  geometry: GridGeometry,
  padding = 0
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;

  const grid = buildExportGrid(data, geometry);
  grid.style.margin = `${padding}px`;

  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    background: "#ffffff",
    boxSizing: "border-box",
    width: `${geometry.width + padding * 2}px`,
    height: `${geometry.height + padding * 2}px`,
  });
  wrapper.appendChild(grid);
  document.body.appendChild(wrapper);

  try {
    const canvasWidth = wrapper.offsetWidth;
    const canvasHeight = wrapper.offsetHeight;
    return await html2canvas(wrapper, {
      scale: EXPORT_SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: canvasWidth,
      height: canvasHeight,
      windowWidth: EXPORT_WIDTH,
    });
  } finally {
    wrapper.remove();
  }
}

export async function exportToJPG(
  data: ExportTableData,
  filename = "schedule.jpg"
): Promise<void> {
  const geometry = computeGeometry(data);
  const canvas = await renderTableToCanvas(data, geometry, JPG_PADDING);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function exportToPDF(
  data: ExportTableData,
  filename = "schedule.pdf"
): Promise<void> {
  const geometry = computeGeometry(data);
  const canvas = await renderTableToCanvas(data, geometry, PDF_PADDING);
  const imgData = canvas.toDataURL("image/jpeg", 0.95);

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
}

