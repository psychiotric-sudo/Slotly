import { useMemo, forwardRef } from "react";
import type { CSSProperties } from "react";
import type { CourseEntry, WeekDay } from "../types";
import { DAY_LABELS, DAY_SHORT } from "../types";
import Icon from "./icons";
import { layoutCourses } from "../utils/conflicts";
import { getAccessibleTextColor } from "../utils/contrast";
import { darkenHex, effectiveColor } from "../utils/colors";
import {
  getGridRowSpan,
  formatTime12,
  measureTextWidth,
  minutesLabel,
  timeToMinutes,
} from "../utils/time";

interface ScheduleCanvasProps {
  courses: CourseEntry[];
  startHour: number;
  endHour: number;
  slotMinutes: 15 | 30;
  activeDays: WeekDay[];
  onEdit: (course: CourseEntry) => void;
  showConflictBadges?: boolean;
  zoom?: number;
  fontSize?: number;
}

function buildTimeLabels(startHour: number, endHour: number, slotMinutes: number): string[] {
  const labels: string[] = [];
  const totalSlots = ((endHour - startHour) * 60) / slotMinutes;
  for (let i = 0; i < totalSlots; i++) {
    const startMin = startHour * 60 + i * slotMinutes;
    const endMin = startMin + slotMinutes;
    const start = formatTime12(
      minutesLabel(Math.floor(startMin / 60), startMin % 60)
    ).replace(/\s*[AP]M$/i, "");
    const end = formatTime12(
      minutesLabel(Math.floor(endMin / 60), endMin % 60)
    ).replace(/\s*[AP]M$/i, "");
    labels.push(`${start}–${end}`);
  }
  return labels;
}

const ScheduleCanvas = forwardRef<HTMLDivElement, ScheduleCanvasProps>(
  function ScheduleCanvas(
    {
      courses,
      startHour,
      endHour,
      slotMinutes,
      activeDays,
      onEdit,
      showConflictBadges = true,
      zoom = 1,
      fontSize = 12,
    },
    ref
  ) {
    const laidOut = useMemo(() => layoutCourses(courses), [courses]);

    /**
     * Always cover every course so no block is clipped:
     * - Start at the configured start hour, or at 0:00 if a class is earlier.
     * - End at the configured end hour, or one slot past the latest class end.
     */
    const { effectiveStartHour, effectiveEndHour } = useMemo(() => {
      let earliest = Infinity;
      let latest = -Infinity;
      for (const c of courses) {
        earliest = Math.min(earliest, timeToMinutes(c.startTime));
        latest = Math.max(latest, timeToMinutes(c.endTime));
      }
      const courseStartHour = courses.length ? Math.floor(earliest / 60) : startHour;
      const latestEndMinutes = courses.length ? latest : -Infinity;
      const courseEndRounded =
        latestEndMinutes === -Infinity
          ? 0
          : Math.ceil(latestEndMinutes / slotMinutes) * slotMinutes;
      const effStart = courseStartHour < startHour ? 0 : startHour;
      const effEndMinutes = Math.max(endHour * 60, courseEndRounded + slotMinutes);
      return { effectiveStartHour: effStart, effectiveEndHour: effEndMinutes / 60 };
    }, [courses, startHour, endHour, slotMinutes]);

    const timeLabels = useMemo(
      () => buildTimeLabels(effectiveStartHour, effectiveEndHour, slotMinutes),
      [effectiveStartHour, effectiveEndHour, slotMinutes]
    );
    const totalSlots = timeLabels.length;
    const rowCount = totalSlots + 1;

    const gridTemplateRows = useMemo(
      () => `${64 * zoom}px repeat(${rowCount}, ${40 * zoom}px)`,
      [rowCount, zoom]
    );

    const timeColWidth = useMemo(() => {
      let max = 0;
      for (const l of timeLabels) {
        max = Math.max(max, measureTextWidth(l, `500 ${fontSize - 1}px Outfit`));
      }
      return Math.ceil(max) + 20;
    }, [timeLabels, fontSize]);

    const gridTemplateColumns = `${timeColWidth}px repeat(${activeDays.length}, minmax(${150 * zoom}px, 1fr))`;

    const byDay = new Map<WeekDay, (typeof laidOut)[number][]>();
    for (const c of laidOut) {
      const list = byDay.get(c.day) ?? [];
      list.push(c);
      byDay.set(c.day, list);
    }

    const condensed = zoom < 0.8;

    const colIndex = new Map<WeekDay, number>(
      activeDays.map((day, i) => [day, i + 2])
    );

    return (
      <div
        className="schedule-canvas"
        ref={ref}
        data-export-root
        style={{ "--grid-font": `${fontSize}px` } as CSSProperties}
      >
        <div
          className="schedule-grid"
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
            const hasConflict = dayCourses.some((c) => c.conflictCount > 0);
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
                <strong>{condensed ? DAY_SHORT[day].toUpperCase() : DAY_LABELS[day]}</strong>
                {!condensed && <span className="day-count">{dayCourses.length}</span>}
              </div>
            );
          })}

          {timeLabels.map((label, i) => {
            const row = i + 2;
            return (
              <div
                key={`time-${label}`}
                className="grid-time"
                style={{ gridColumn: "1 / span 1", gridRow: `${row} / ${row + 1}` }}
              >
                <span>{label}</span>
              </div>
            );
          })}

          {activeDays.map((day) => {
            const col = colIndex.get(day)!;
            return Array.from({ length: totalSlots }).map((_, i) => {
              const row = i + 2;
              const isMidSlot =
                (i + (effectiveStartHour * 60) / slotMinutes) % (60 / slotMinutes) !== 0;
              return (
                <div
                  key={`cell-${day}-${i}`}
                  className={`grid-cell${isMidSlot ? " half" : ""}`}
                  style={{ gridColumn: `${col} / span 1`, gridRow: `${row} / ${row + 1}` }}
                />
              );
            });
          })}

          {laidOut
            .filter((c) => activeDays.includes(c.day))
            .map((course) => {
              const { gridRowStart, gridRowEnd } = getGridRowSpan(
                course.startTime,
                course.endTime,
                effectiveStartHour,
                slotMinutes
              );
              const color = effectiveColor(course);
              const textColor = getAccessibleTextColor(color);
              const conflicting = course.conflictCount > 0;
              return (
                <button
                  key={course.id}
                  type="button"
                  className={`course-block${conflicting ? " has-conflict" : ""}${condensed ? " course-block--condensed" : ""}`}
                  style={{
                    gridColumn: `${colIndex.get(course.day)} / span 1`,
                    gridRow: `${gridRowStart} / ${gridRowEnd}`,
                    backgroundColor: color,
                    color: textColor,
                    borderColor: darkenHex(color, 0.28),
                    width: `${course.widthPercent}%`,
                    marginLeft: `${course.leftOffsetPercent}%`,
                  }}
                  onClick={() => onEdit(course)}
                  title={`${course.title || course.code}${course.title && course.code ? ` — ${course.code}` : ""}\n${formatTime12(course.startTime)}–${formatTime12(course.endTime)}`}
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
                  {condensed ? (
                    <span className="course-block__code">
                      {course.code || course.title}
                    </span>
                  ) : (
                    <>
                      <span className="course-block__title">
                        {course.title || course.code}
                      </span>
                      {course.title && course.code && (
                        <span className="course-block__code">{course.code}</span>
                      )}
                      <span className="course-block__meta">
                        {formatTime12(course.startTime)}–{formatTime12(course.endTime)}
                      </span>
                      {(course.room || course.instructor) && (
                        <span className="course-block__meta">
                          {course.instructor}
                          {course.instructor && course.room ? " · " : ""}
                          {course.room}
                        </span>
                      )}
                    </>
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
