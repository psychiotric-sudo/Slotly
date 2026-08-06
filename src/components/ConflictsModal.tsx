import { useMemo } from "react";
import Modal from "./Modal";
import Icon from "./icons";
import type { CourseEntry, WeekDay } from "../types";
import { DAY_LABELS } from "../types";
import type { ConflictPair } from "../utils/conflicts";
import { formatTime12, minutesToTime } from "../utils/time";
import { effectiveColor } from "../utils/colors";

interface CourseRowProps {
  course: CourseEntry;
  onDrop: (course: CourseEntry) => void;
  onHighlight: (id: string) => void;
}

function CourseRow({ course, onDrop, onHighlight }: CourseRowProps) {
  const name = course.code ? `${course.code} – ${course.title}` : course.title;
  return (
    <div className="conflict-course">
      <button
        type="button"
        className="conflict-course__name"
        onClick={() => onHighlight(course.id)}
        title="Highlight on the grid"
      >
        <span className="conflict-course__dot" style={{ background: effectiveColor(course) }} />
        <span>{name}</span>
      </button>
      <button
        type="button"
        className="btn-danger-ghost"
        onClick={() => onDrop(course)}
        title="Remove this course"
      >
        <Icon name="trash" size={14} />
        Drop
      </button>
    </div>
  );
}

interface ConflictsModalProps {
  pairs: ConflictPair[];
  onDrop: (course: CourseEntry) => void;
  onHighlight: (courseIds: string[]) => void;
  onClose: () => void;
}

function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

export default function ConflictsModal({
  pairs,
  onDrop,
  onHighlight,
  onClose,
}: ConflictsModalProps) {
  const grouped = useMemo(() => {
    const order: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const byDay = new Map<WeekDay, ConflictPair[]>();
    for (const pair of pairs) {
      const list = byDay.get(pair.day) ?? [];
      list.push(pair);
      byDay.set(pair.day, list);
    }
    return order.filter((d) => byDay.has(d)).map((d) => [d, byDay.get(d)!] as const);
  }, [pairs]);

  return (
    <Modal
      role="dialog"
      labelledBy="conflicts-modal-title"
      onClose={onClose}
      className="conflicts-modal"
    >
      <header className="modal-header">
        <h2 id="conflicts-modal-title">
          <span className="conflicts-title-icon">
            <Icon name="alert" size={16} />
          </span>
          {pairs.length} clash{pairs.length === 1 ? "" : "es"}
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>
      </header>

      <div className="modal-body conflicts-body">
        {pairs.length === 0 ? (
          <p className="conflicts-empty">No clashes — your schedule is clear.</p>
        ) : (
          grouped.map(([day, dayPairs]) => (
            <section key={day} className="conflicts-day">
              <h3 className="conflicts-day__title">{DAY_LABELS[day]}</h3>
              {dayPairs.map((pair, idx) => (
                <div
                  key={`${pair.day}-${idx}`}
                  className="conflict-card"
                  onClick={() =>
                    onHighlight(pair.b ? [pair.a.id, pair.b.id] : [pair.a.id])
                  }
                >
                  <div className="conflict-card__time">
                    <span>{formatTime12(minutesToTime(pair.startMin))}</span>–
                    <span>{formatTime12(minutesToTime(pair.endMin))}</span>
                    <em>{durationLabel(pair.overlapMinutes)}</em>
                  </div>
                  {pair.kind === "break" ? (
                    <>
                      <CourseRow
                        course={pair.a}
                        onDrop={onDrop}
                        onHighlight={(id) => onHighlight([id])}
                      />
                      <div className="conflict-break-note">
                        <Icon name="alert" size={12} />
                        runs into break “{pair.br?.label}”
                      </div>
                    </>
                  ) : (
                    <>
                      <CourseRow
                        course={pair.a}
                        onDrop={onDrop}
                        onHighlight={(id) => onHighlight([id])}
                      />
                      <div className="conflict-vs">vs</div>
                      <CourseRow
                        course={pair.b!}
                        onDrop={onDrop}
                        onHighlight={(id) => onHighlight([id])}
                      />
                    </>
                  )}
                </div>
              ))}
            </section>
          ))
        )}
      </div>

      <footer className="modal-footer">
        <div className="footer-spacer" />
        <button type="button" className="btn-primary" data-default-focus onClick={onClose}>
          Done
        </button>
      </footer>
    </Modal>
  );
}