import {
  useMemo,
  forwardRef,
  useEffect,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
import type { CSSProperties } from "react";
import type { CourseEntry, ScheduleBreak, SlotMinutes, WeekDay } from "../types";
import { DAY_LABELS, DAY_SHORT } from "../types";
import Icon from "./icons";
import { layoutCourses } from "../utils/conflicts";
import { getAccessibleTextColor } from "../utils/contrast";
import { darkenHex, effectiveColor } from "../utils/colors";
import {
  bandTimeLabel,
  buildGridRowModel,
  clamp,
  fitBlockContent,
  formatTime12,
  measureTextWidth,
  minutesToTime,
  timeToMinutes,
} from "../utils/time";

interface ScheduleCanvasProps {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  startHour: number;
  endHour: number;
  slotMinutes: SlotMinutes;
  activeDays: WeekDay[];
  onEdit: (course: CourseEntry) => void;
  /** Fired when a block is dragged to a new day/time (or resized). */
  onMoveCourse?: (course: CourseEntry, day: WeekDay, startTime: string, endTime: string) => void;
  showConflictBadges?: boolean;
  showBreaks?: boolean;
  simplifyView?: boolean;
  /** Squeeze every day column onto one screen instead of leaving it wide enough to overflow/zoom. */
  fitAllDays?: boolean;
  zoom?: number;
  fontSize?: number;
  /** Course ids to flash with a highlight ring (e.g. from the conflict panel). */
  highlightedCourseIds?: Set<string>;
}

const ScheduleCanvas = forwardRef<HTMLDivElement, ScheduleCanvasProps>(
  function ScheduleCanvas(
    {
      courses,
      breaks,
      startHour,
      endHour,
      slotMinutes,
      activeDays,
      onEdit,
      onMoveCourse,
      showConflictBadges = true,
      showBreaks = true,
      simplifyView = true,
      fitAllDays = false,
      zoom = 1,
      fontSize = 12,
      highlightedCourseIds,
    },
    ref
  ) {
    const laidOut = useMemo(() => layoutCourses(courses, breaks), [courses, breaks]);

    const canvasEl = useRef<HTMLDivElement | null>(null);
    const [availWidth, setAvailWidth] = useState(0);

    // Force the short "MON/TUE" header labels (and hide the count pill) as the
    // default on small screens, regardless of column width or zoom.
    const [isPhone, setIsPhone] = useState(
      () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
    );
    useEffect(() => {
      const mq = window.matchMedia("(max-width: 639px)");
      const update = () => setIsPhone(mq.matches);
      update();
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
      const el = canvasEl.current;
      if (!el) return;
      const measure = () => setAvailWidth(el.clientWidth);
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const setCanvasRef = (node: HTMLDivElement | null) => {
      canvasEl.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    /**
     * Always cover every course so no block is clipped:
     * - Start at the configured start hour, or at 0:00 if a class is earlier.
     * - End at the configured end hour, or one slot past the latest class end.
     */
    const { effectiveStartHour, totalSlots } = useMemo(() => {
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
      const hasData = courses.length > 0 || breaks.length > 0;
      const courseStartHour = hasData ? Math.floor(earliest / 60) : startHour;
      const latestEndMinutes = hasData ? latest : -Infinity;
      const courseEndRounded =
        latestEndMinutes === -Infinity
          ? 0
          : Math.ceil(latestEndMinutes / slotMinutes) * slotMinutes;
      const effStart = courseStartHour < startHour ? 0 : startHour;
      const effEndMinutes = Math.max(endHour * 60, courseEndRounded);
      return {
        effectiveStartHour: effStart,
        effectiveEndMinutes: effEndMinutes,
        totalSlots: (effEndMinutes - effStart * 60) / slotMinutes,
      };
    }, [courses, breaks, startHour, endHour, slotMinutes]);

    const { rows, slotToRow } = useMemo(
      () =>
        buildGridRowModel(
          courses,
          breaks,
          effectiveStartHour,
          slotMinutes,
          totalSlots,
          simplifyView
        ),
      [courses, breaks, effectiveStartHour, slotMinutes, totalSlots, simplifyView]
    );
    const rowsCount = rows.length;

    const rowTimeLabels = useMemo(() => rows.map(bandTimeLabel), [rows]);

    const gridTemplateRows = useMemo(
      () => `${Math.min(64 * zoom, 80)}px repeat(${rowsCount}, ${40 * zoom}px)`,
      [rowsCount, zoom]
    );

    const timeColWidth = useMemo(() => {
      let max = 0;
      for (const l of rowTimeLabels) {
        max = Math.max(max, measureTextWidth(l, `500 ${fontSize - 1}px Outfit`));
      }
      return Math.ceil(max) + 20;
    }, [rowTimeLabels, fontSize]);

    const dayCount = activeDays.length;
    const dayShare =
      availWidth > 0 && dayCount > 0
        ? Math.max(0, (availWidth - timeColWidth) / dayCount)
        : Infinity;
    const dayColW = dayCount > 0 ? dayShare : 150 * zoom;
    // Keep a readable minimum column width so a phone can scroll/zoom rather
    // than relentlessly squeezing every column to fit the screen width.
    // "Fit all days" opts back into squeezing everything onto the screen.
    const colW =
      dayCount > 0 ? (fitAllDays ? dayColW : Math.max(dayColW, 104)) : 150 * zoom;
    const gridTemplateColumns = `${timeColWidth}px repeat(${dayCount}, minmax(${Math.min(
      150 * zoom,
      colW
    )}px, 1fr))`;

    // Use "MON" short day labels and hide the count pill once the column is too
    // narrow to fit the full day name, instead of flipping only on zoom level.
    const dayLabelW = measureTextWidth("Wednesday", `${fontSize + 1}px`);
    const useShortDays = isPhone || colW < dayLabelW + 8;

    const byDay = new Map<WeekDay, (typeof laidOut)[number][]>();
    for (const c of laidOut) {
      const list = byDay.get(c.day) ?? [];
      list.push(c);
      byDay.set(c.day, list);
    }

    const colIndex = new Map<WeekDay, number>(
      activeDays.map((day, i) => [day, i + 2])
    );

    /** Maps a time range to its grid-row lines in the compressed row model. */
    const rowSpanOf = (startTime: string, endTime: string) => {
      const s0 = Math.max(
        0,
        Math.floor((timeToMinutes(startTime) - effectiveStartHour * 60) / slotMinutes)
      );
      const s1 = Math.min(
        totalSlots,
        Math.ceil((timeToMinutes(endTime) - effectiveStartHour * 60) / slotMinutes)
      );
      const first = s0 >= totalSlots ? rowsCount - 1 : slotToRow[s0];
      const lastSlot = Math.max(0, s1 - 1);
      const last = s1 <= 0 ? 0 : lastSlot >= totalSlots ? rowsCount - 1 : slotToRow[lastSlot];
      return { gridRowStart: first + 2, gridRowEnd: last + 3 };
    };

    // ---- Drag to move / resize (pointer based; disabled in simplified view) ----
    const gridRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{
      id: string;
      mode: "move" | "resize";
      grabOffsetPx: number;
      durationSlots: number;
      startSlot: number;
    } | null>(null);
    const didDragRef = useRef(false);
    const [dragPreview, setDragPreview] = useState<{
      courseId: string;
      day: WeekDay;
      startTime: string;
      endTime: string;
    } | null>(null);

    const dragEnabled = !simplifyView && typeof onMoveCourse === "function";
    const headerH = Math.min(64 * zoom, 80);
    const rowH = 40 * zoom;

    const geomFromEvent = (e: { clientX: number; clientY: number }) => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const relY = e.clientY - rect.top - headerH;
      const slotF = relY / rowH;
      const relX = e.clientX - rect.left - timeColWidth;
      const actualColW = dayCount > 0 ? (rect.width - timeColWidth) / dayCount : colW;
      const dayIdx = clamp(Math.floor(relX / actualColW), 0, Math.max(0, dayCount - 1));
      return { slotF, day: activeDays[dayIdx] };
    };

    const startSlotOf = (c: CourseEntry) =>
      Math.round((timeToMinutes(c.startTime) - effectiveStartHour * 60) / slotMinutes);
    const durationSlotsOf = (c: CourseEntry) =>
      Math.max(
        1,
        Math.round(
          (timeToMinutes(c.endTime) - timeToMinutes(c.startTime)) / slotMinutes
        )
      );

    const beginDrag = (
      e: RPointerEvent,
      course: CourseEntry,
      mode: "move" | "resize"
    ) => {
      if (!dragEnabled || e.button !== 0) return;
      const g = geomFromEvent(e);
      if (!g) return;
      const startSlot = startSlotOf(course);
      const grabOffsetPx = mode === "move" ? g.slotF * rowH - startSlot * rowH : 0;
      dragRef.current = {
        id: course.id,
        mode,
        grabOffsetPx,
        durationSlots: durationSlotsOf(course),
        startSlot,
      };
      didDragRef.current = false;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const onBlockPointerMove = (e: RPointerEvent, course: CourseEntry) => {
      const d = dragRef.current;
      if (!d || d.id !== course.id || d.mode !== "move") return;
      const g = geomFromEvent(e);
      if (!g) return;
      didDragRef.current = true;
      const targetStart = clamp(
        Math.round((g.slotF * rowH - d.grabOffsetPx) / rowH),
        0,
        Math.max(0, totalSlots - d.durationSlots)
      );
      const startMin = effectiveStartHour * 60 + targetStart * slotMinutes;
      const endMin = startMin + d.durationSlots * slotMinutes;
      setDragPreview({
        courseId: course.id,
        day: g.day,
        startTime: minutesToTime(startMin),
        endTime: minutesToTime(endMin),
      });
    };

    const onBlockPointerUp = (course: CourseEntry) => {
      const d = dragRef.current;
      if (d && d.id === course.id && d.mode === "move" && didDragRef.current && dragPreview) {
        onMoveCourse?.(course, dragPreview.day, dragPreview.startTime, dragPreview.endTime);
      }
      dragRef.current = null;
      setDragPreview(null);
    };

    const onGripPointerMove = (e: RPointerEvent, course: CourseEntry) => {
      const d = dragRef.current;
      if (!d || d.id !== course.id || d.mode !== "resize") return;
      const g = geomFromEvent(e);
      if (!g) return;
      didDragRef.current = true;
      const endSlot = clamp(
        Math.round(g.slotF) + 1,
        d.startSlot + 1,
        Math.max(d.startSlot + 1, totalSlots)
      );
      const endMin = effectiveStartHour * 60 + endSlot * slotMinutes;
      setDragPreview({
        courseId: course.id,
        day: course.day,
        startTime: course.startTime,
        endTime: minutesToTime(endMin),
      });
    };

    const onGripPointerUp = (course: CourseEntry) => {
      const d = dragRef.current;
      if (d && d.id === course.id && d.mode === "resize" && didDragRef.current && dragPreview) {
        onMoveCourse?.(course, course.day, course.startTime, dragPreview.endTime);
      }
      dragRef.current = null;
      setDragPreview(null);
    };

    return (
      <div
        className="schedule-canvas"
        ref={setCanvasRef}
        data-export-root
        style={{ "--grid-font": `${fontSize}px` } as CSSProperties}
      >
        {courses.length === 0 && (
          <div className="grid-empty-hint">
            No classes yet — add one from the panel on the left, or import a
            schedule.
          </div>
        )}
        <div
          className="schedule-grid"
          ref={gridRef}
          style={{
            gridTemplateColumns,
            gridTemplateRows,
          }}
        >
          <div className="grid-corner">
            <span>Time</span>
          </div>

          {activeDays.map((day, i) => {
            const dayCourses = byDay.get(day) ?? [];
            const hasConflict = dayCourses.some(
              (c) => c.conflictCount > 0 || c.overlapsBreak
            );
            return (
              <div
                key={`header-${day}`}
                className={`grid-day-header${hasConflict ? " has-conflict" : ""}`}
                data-day-header={day}
                style={{
                  gridRow: "1 / 2",
                  gridColumn: `${colIndex.get(day)} / span 1`,
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <strong>{useShortDays ? DAY_SHORT[day].toUpperCase() : DAY_LABELS[day]}</strong>
                {!useShortDays && <span className="day-count">{dayCourses.length}</span>}
              </div>
            );
          })}

          {rows.map((row, i) => {
            const gridRow = `${i + 2} / ${i + 3}`;
            const label = rowTimeLabels[i];
            const isTrailingFree = !row.occupied && i === rows.length - 1;
            return (
              <div
                key={`time-${i}`}
                className={`grid-time${row.occupied || isTrailingFree ? "" : " grid-time--merged"}`}
                style={{ gridColumn: "1 / span 1", gridRow }}
              >
                <span>{label}</span>
              </div>
            );
          })}

          {activeDays.map((day) => {
            const col = colIndex.get(day)!;
            return rows.map((row, i) => {
              if (!row.occupied) return null;
              const isMidSlot =
                (row.slots[0] + (effectiveStartHour * 60) / slotMinutes) %
                  (60 / slotMinutes) !==
                0;
              return (
                <div
                  key={`cell-${day}-${i}`}
                  className={`grid-cell${isMidSlot ? " half" : ""}`}
                  style={{
                    gridColumn: `${col} / span 1`,
                    gridRow: `${i + 2} / ${i + 3}`,
                  }}
                />
              );
            });
          })}

          {rows.map((row, i) => {
            if (row.occupied) return null;
            if (i === rows.length - 1) return null;
            return (
              <div
                key={`break-row-${i}`}
                className="grid-break grid-break--free"
                style={{
                  gridColumn: `2 / span ${activeDays.length}`,
                  gridRow: `${i + 2} / ${i + 3}`,
                }}
              >
                FREE TIME
              </div>
            );
          })}

          {showBreaks &&
            breaks
              .filter(() => activeDays.length > 0)
              .map((br) => {
                const { gridRowStart, gridRowEnd } = rowSpanOf(br.startTime, br.endTime);
                return (
                  <div
                    key={br.id}
                    className="grid-break"
                    style={{
                      gridColumn: `2 / span ${activeDays.length}`,
                      gridRow: `${gridRowStart} / ${gridRowEnd}`,
                    }}
                  >
                    {br.label}
                  </div>
                );
              })}

          {laidOut
            .filter((c) => activeDays.includes(c.day))
            .map((course) => {
              const preview =
                dragPreview && dragPreview.courseId === course.id ? dragPreview : null;
              const isDragging = preview !== null;
              const day = preview?.day ?? course.day;
              const startTime = preview?.startTime ?? course.startTime;
              const endTime = preview?.endTime ?? course.endTime;
              const { gridRowStart, gridRowEnd } = rowSpanOf(startTime, endTime);
              const color = effectiveColor(course);
              const textColor = getAccessibleTextColor(color);
              const conflicting = course.conflictCount > 0 || course.overlapsBreak;
              const rowsSpanned = gridRowEnd - gridRowStart;
              const blockHeight = rowsSpanned * 40 * zoom;
              const blockWidth = colW * (course.widthPercent / 100);
              const codeLabel = course.section
                ? `${course.code} · ${course.section}`
                : course.code;
              const lines = [
                course.title || codeLabel,
                ...(course.title && course.code ? [codeLabel] : []),
                `${formatTime12(startTime)}–${formatTime12(endTime)}`,
                ...(course.room || course.instructor
                  ? [[course.instructor, course.room].filter(Boolean).join(" · ")]
                  : []),
              ];
              const fit = fitBlockContent(lines, blockWidth, blockHeight, fontSize, "Outfit");
              return (
                <button
                  key={course.id}
                  type="button"
                  className={`course-block${conflicting ? " has-conflict" : ""}${
                    highlightedCourseIds?.has(course.id) ? " course-block--highlight" : ""
                  }${fit.lines.length === 1 ? " course-block--condensed" : ""}${
                    isDragging ? " course-block--dragging" : ""
                  }`}
                  style={{
                    gridColumn: `${colIndex.get(day)} / span 1`,
                    gridRow: `${gridRowStart} / ${gridRowEnd}`,
                    backgroundColor: color,
                    color: textColor,
                    borderColor: darkenHex(color, 0.28),
                    width: `${course.widthPercent}%`,
                    marginLeft: `${course.leftOffsetPercent}%`,
                    ...(dragEnabled ? { touchAction: "none" } : null),
                  }}
                  onPointerDown={(e) => beginDrag(e, course, "move")}
                  onPointerMove={(e) => onBlockPointerMove(e, course)}
                  onPointerUp={() => onBlockPointerUp(course)}
                  onPointerCancel={() => onBlockPointerUp(course)}
                  onClick={() => {
                    if (didDragRef.current) {
                      didDragRef.current = false;
                      return;
                    }
                    onEdit(course);
                  }}
                  title={`${course.title || course.code}${course.title && course.code ? ` — ${course.code}` : ""}\n${formatTime12(startTime)}–${formatTime12(endTime)}`}
                >
                  {showConflictBadges && conflicting && (
                    <span
                      className="conflict-badge"
                      aria-label="conflicting timeslot"
                      title="Overlaps with another class"
                    >
                      <Icon name="alert" size={13} />
                    </span>
                  )}
                  {fit.lines.map((line, li) => (
                    <span
                      key={li}
                      className={
                        li === 0
                          ? "course-block__title"
                          : li === 1
                            ? "course-block__code"
                            : "course-block__meta"
                      }
                      style={{ fontSize: fit.fontSize }}
                    >
                      {line}
                    </span>
                  ))}
                  {dragEnabled && (
                    <span
                      className="course-block__resize"
                      title="Drag to resize"
                      aria-hidden="true"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        beginDrag(e, course, "resize");
                      }}
                      onPointerMove={(e) => onGripPointerMove(e, course)}
                      onPointerUp={() => onGripPointerUp(course)}
                      onPointerCancel={() => onGripPointerUp(course)}
                    />
                  )}
                </button>
              );
            })}
        </div>
      </div>
    );
  }
);

export default ScheduleCanvas;
