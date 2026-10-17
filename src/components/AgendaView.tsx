import { useMemo } from "react";
import type { CourseEntry, ScheduleBreak, WeekDay } from "../types";
import { DAY_LABELS } from "../types";
import { effectiveColor } from "../utils/colors";
import { layoutCourses } from "../utils/conflicts";
import { formatTime12, timeToMinutes } from "../utils/time";

interface AgendaViewProps {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  activeDays: WeekDay[];
  showBreaks: boolean;
  simplifyView: boolean;
  highlightedCourseIds: Set<string>;
  onEdit: (course: CourseEntry) => void;
}

type TimelineItem =
  | {
      kind: "course";
      course: CourseEntry;
      conflicts: boolean;
      breakClash: boolean;
    }
  | { kind: "break"; brk: ScheduleBreak };

function itemStart(item: TimelineItem): number {
  return timeToMinutes(
    item.kind === "course" ? item.course.startTime : item.brk.startTime
  );
}

export default function AgendaView({
  courses,
  breaks,
  activeDays,
  showBreaks,
  simplifyView,
  highlightedCourseIds,
  onEdit,
}: AgendaViewProps) {
  const flags = useMemo(() => {
    const map = new Map<string, { conflicts: boolean; breakClash: boolean }>();
    for (const c of layoutCourses(courses, breaks)) {
      map.set(c.id, {
        conflicts: c.conflictCount > 0,
        breakClash: c.overlapsBreak,
      });
    }
    return map;
  }, [courses, breaks]);

  const days = useMemo(() => {
    return activeDays.map((day) => {
      const items: TimelineItem[] = courses
        .filter((c) => c.day === day)
        .map((course) => ({
          kind: "course" as const,
          course,
          conflicts: flags.get(course.id)?.conflicts ?? false,
          breakClash: flags.get(course.id)?.breakClash ?? false,
        }));
      if (showBreaks) {
        for (const brk of breaks) items.push({ kind: "break", brk });
      }
      items.sort((a, b) => {
        const diff = itemStart(a) - itemStart(b);
        if (diff !== 0) return diff;
        if (a.kind !== b.kind) return a.kind === "break" ? -1 : 1;
        return 0;
      });
      return { day, items };
    });
  }, [courses, breaks, activeDays, showBreaks, flags]);

  const totalCourses = courses.length;
  const showEmpty = totalCourses === 0 && (!showBreaks || breaks.length === 0);

  if (showEmpty) {
    return (
      <div className="agenda agenda--empty">
        <p className="agenda-empty-title">Nothing scheduled yet.</p>
        <p className="agenda-empty-note">
          Add a class and it will show up here, day by day.
        </p>
      </div>
    );
  }

  return (
    <div className="agenda">
      {days.map(({ day, items }) => {
        const courseCount = items.filter((i) => i.kind === "course").length;
        return (
          <section className="agenda-day" key={day}>
            <header className="agenda-day-head">
              <h3>{DAY_LABELS[day]}</h3>
              <span>
                {courseCount === 0
                  ? "free"
                  : `${courseCount} class${courseCount === 1 ? "" : "es"}`}
              </span>
            </header>

            {items.length === 0 ? (
              <p className="agenda-day-empty">Nothing scheduled.</p>
            ) : (
              <ul className="agenda-list">
                {items.map((item) =>
                  item.kind === "break" ? (
                    <li
                      key={`break-${item.brk.id}`}
                      className="agenda-item agenda-item--break"
                    >
                      <span className="agenda-time">
                        <strong>{formatTime12(item.brk.startTime)}</strong>
                        <span>{formatTime12(item.brk.endTime)}</span>
                      </span>
                      <span
                        className="agenda-bar agenda-bar--break"
                        aria-hidden="true"
                      />
                      <span className="agenda-body">
                        <span className="agenda-title">{item.brk.label}</span>
                      </span>
                    </li>
                  ) : (
                    <li key={item.course.id}>
                      <button
                        type="button"
                        className={`agenda-item agenda-item--course${
                          highlightedCourseIds.has(item.course.id)
                            ? " is-highlighted"
                            : ""
                        }`}
                        onClick={() => onEdit(item.course)}
                        aria-label={`Edit ${item.course.code} on ${DAY_LABELS[day]}, ${formatTime12(item.course.startTime)} to ${formatTime12(item.course.endTime)}`}
                      >
                        <span className="agenda-time">
                          <strong>{formatTime12(item.course.startTime)}</strong>
                          <span>{formatTime12(item.course.endTime)}</span>
                        </span>
                        <span
                          className="agenda-bar"
                          style={{ background: effectiveColor(item.course) }}
                          aria-hidden="true"
                        />
                        <span className="agenda-body">
                          <span className="agenda-title">
                            <strong>{item.course.code}</strong>
                            {item.course.title ? (
                              <span> — {item.course.title}</span>
                            ) : null}
                          </span>
                          {!simplifyView &&
                            (item.course.instructor || item.course.room) && (
                              <span className="agenda-meta">
                                {[
                                  item.course.instructor,
                                  item.course.room,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            )}
                          {(item.breakClash || item.conflicts) && (
                            <span className="agenda-flags">
                              {item.breakClash && (
                                <span className="agenda-flag agenda-flag--break">
                                  Clashes with a break
                                </span>
                              )}
                              {item.conflicts && (
                                <span className="agenda-flag">
                                  Overlaps another class
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
