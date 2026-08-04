import type { CourseEntry } from "../types";
import { DAY_SHORT } from "../types";
import Icon from "./icons";
import { courseGroupKey, effectiveColor } from "../utils/colors";
import { formatTime12 } from "../utils/time";
import { buildGcalAddUrl, groupCourses } from "../utils/gcal";

interface CourseListProps {
  courses: CourseEntry[];
  onEdit: (course: CourseEntry) => void;
  onDelete: (course: CourseEntry) => void;
}

function dayIndex(day: CourseEntry["day"]): number {
  return "MONTUEWEDTHUFRISATSUN".indexOf(day);
}

export default function CourseList({ courses, onEdit, onDelete }: CourseListProps) {
  const byKey = new Map<string, CourseEntry[]>();
  for (const c of courses) {
    const key = courseGroupKey(c);
    const list = byKey.get(key) ?? [];
    list.push(c);
    byKey.set(key, list);
  }

  const groups = groupCourses(courses)
    .map((group) => ({ group, entries: byKey.get(group.key) ?? [] }))
    .filter((x) => x.entries.length > 0)
    .sort(
      (a, b) =>
        dayIndex(a.group.days[0]) - dayIndex(b.group.days[0]) ||
        a.group.startTime.localeCompare(b.group.startTime)
    );

  if (groups.length === 0) {
    return (
      <p className="empty-list">
        No classes yet. Hit <strong>Add Class</strong> to schedule your first
        course, or load the demo data.
      </p>
    );
  }

  return (
    <ul className="course-list">
      {groups.map(({ group, entries }) => {
        const first = entries[0];
        const gcalUrl = buildGcalAddUrl(group);
        return (
          <li key={group.key} className="course-card">
            <span
              className="course-card-colorbar"
              style={{ backgroundColor: effectiveColor(first) }}
              aria-hidden="true"
            />
            <div className="course-card-main">
              <div className="course-card-top">
                <strong className="course-card-title">
                  {group.title || group.code}
                </strong>
                <span className="course-card-days">
                  {group.days.map((d) => (
                    <span key={d} className="course-card-day">
                      {DAY_SHORT[d]}
                    </span>
                  ))}
                </span>
              </div>
              {group.title && group.code && (
                <span className="course-card-code">{group.code}</span>
              )}
              <span className="course-card-time">
                {formatTime12(group.startTime)}–{formatTime12(group.endTime)}
                {group.room ? ` · ${group.room}` : ""}
              </span>
            </div>
            <div className="course-card-actions">
              <a
                className="icon-btn"
                href={gcalUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Add ${group.title} to Google Calendar`}
                title="Add to Google Calendar"
              >
                <Icon name="calendar" size={15} />
              </a>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onEdit(first)}
                aria-label={`Edit ${group.title}`}
                title="Edit"
              >
                <Icon name="pencil" size={15} />
              </button>
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => onDelete(first)}
                aria-label={`Delete ${group.title}`}
                title="Delete"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
