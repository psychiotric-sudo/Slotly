import { useMemo, useState } from "react";
import type { CourseEntry, CourseFormResult, WeekDay } from "../types";
import { DAY_LABELS, DAY_SHORT, WEEK_DAYS } from "../types";
import Modal from "./Modal";
import Icon from "./icons";
import { findConflicts } from "../utils/conflicts";
import { hasReadableText, getAccessibleTextColor } from "../utils/contrast";
import { PALETTE, getAutoColor, courseGroupKey } from "../utils/colors";
import { validTime, timeToMinutes, formatTime12 } from "../utils/time";

interface CourseModalProps {
  course: CourseEntry | null;
  editingKey: string | null;
  allCourses: CourseEntry[];
  onSave: (result: CourseFormResult) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

interface FormState {
  title: string;
  code: string;
  section: string;
  instructor: string;
  room: string;
  startTime: string;
  endTime: string;
  colorOverride: string | null; // null = auto
}

function groupDays(allCourses: CourseEntry[], editingKey: string | null): WeekDay[] {
  if (!editingKey) return [];
  return Array.from(
    new Set(
      allCourses
        .filter((c) => courseGroupKey(c) === editingKey)
        .map((c) => c.day)
    )
  );
}

export default function CourseModal({
  course,
  editingKey,
  allCourses,
  onSave,
  onDelete,
  onClose,
}: CourseModalProps) {
  const editing = course !== null;
  const [form, setForm] = useState<FormState>(() => ({
    title: course?.title ?? "",
    code: course?.code ?? "",
    section: course?.section ?? "",
    instructor: course?.instructor ?? "",
    room: course?.room ?? "",
    startTime: course?.startTime ?? "08:00",
    endTime: course?.endTime ?? "09:30",
    colorOverride: course?.colorOverride ?? null,
  }));
  const [days, setDays] = useState<WeekDay[]>(() => groupDays(allCourses, editingKey));
  const [customColor, setCustomColor] = useState(() => course?.colorOverride != null);
  const [customHex, setCustomHex] = useState(course?.colorOverride ?? "#93C5FD");
  const [addAnyway, setAddAnyway] = useState(() => course !== null);
  const [colorError, setColorError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day: WeekDay) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const timeInvalid =
    !validTime(form.startTime) ||
    !validTime(form.endTime) ||
    timeToMinutes(form.endTime) <= timeToMinutes(form.startTime);

  const noDays = days.length === 0;

  const autoColor = getAutoColor(
    courseGroupKey({ code: form.code, title: form.title, section: form.section })
  );
  const displayColor = form.colorOverride ?? autoColor;

  const conflicts = useMemo(() => {
    if (!form.title.trim() && !form.code.trim()) return [];
    const others = editingKey
      ? allCourses.filter((c) => courseGroupKey(c) !== editingKey)
      : allCourses;
    const seen = new Set<string>();
    const result: CourseEntry[] = [];
    for (const day of days) {
      const candidate: CourseEntry = {
        id: "pending",
        title: form.title,
        code: form.code,
        instructor: form.instructor,
        room: form.room,
        day,
        startTime: form.startTime,
        endTime: form.endTime,
        colorHex: displayColor,
        colorOverride: form.colorOverride ?? undefined,
        createdAt: Date.now(),
      };
      for (const conflict of findConflicts(others, candidate)) {
        if (!seen.has(conflict.id)) {
          seen.add(conflict.id);
          result.push(conflict);
        }
      }
    }
    return result;
  }, [allCourses, editingKey, form, days, displayColor]);

  const blocked = timeInvalid || noDays || !form.title.trim();
  const savingBlocked = blocked || (conflicts.length > 0 && !addAnyway);

  const pickAuto = () => {
    setColorError(null);
    set("colorOverride", null);
    setCustomColor(false);
  };

  const pickPalette = (hex: string) => {
    setColorError(null);
    set("colorOverride", hex);
    setCustomColor(false);
    setCustomHex(hex);
  };

  const applyCustomColor = (hex: string) => {
    if (!hasReadableText(hex)) {
      setColorError(
        "This color is too light/dark to read text on — try a different shade."
      );
      return;
    }
    setColorError(null);
    set("colorOverride", hex);
    setCustomColor(true);
    setCustomHex(hex);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (savingBlocked) return;
    onSave({
      base: {
        title: form.title.trim(),
        code: form.code.trim(),
        section: form.section.trim() || undefined,
        instructor: form.instructor.trim(),
        room: form.room.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        colorHex: displayColor,
        colorOverride: form.colorOverride ?? undefined,
      },
      days,
      editingKey,
    });
  };

  const textColor = getAccessibleTextColor(displayColor);

  return (
    <Modal
      role="dialog"
      labelledBy="course-modal-title"
      onClose={onClose}
      className="course-modal"
    >
      <form onSubmit={handleSubmit} noValidate>
        <header className="modal-header">
          <h2 id="course-modal-title">{editing ? "Edit Class" : "Add Class"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="cm-title">Course Title *</label>
            <input
              id="cm-title"
              className="input"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="cm-code">
              Course Code <span className="field-hint">(optional — used for the Google event name)</span>
            </label>
            <input
              id="cm-code"
              className="input"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="e.g. CS 202"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="cm-section">
              Section <span className="field-hint">(optional — to try alternative schedules of the same subject, e.g. A or B)</span>
            </label>
            <input
              id="cm-section"
              className="input"
              value={form.section}
              onChange={(e) => set("section", e.target.value)}
              placeholder="e.g. A"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label>Days * <span className="field-hint">— check every day this class meets</span></label>
            <div className="day-checkboxes" role="group" aria-label="Scheduled days">
              {WEEK_DAYS.map((day) => {
                const active = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`day-chip${active ? " active" : ""}`}
                    onClick={() => toggleDay(day)}
                    aria-pressed={active}
                    title={DAY_LABELS[day]}
                  >
                    {DAY_SHORT[day]}
                  </button>
                );
              })}
            </div>
            {noDays && <p className="form-error">Select at least one day.</p>}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="cm-instructor">Instructor</label>
              <input
                id="cm-instructor"
                className="input"
                value={form.instructor}
                onChange={(e) => set("instructor", e.target.value)}
                placeholder="e.g. Prof. A. Reyes"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="cm-room">Room / Building</label>
              <input
                id="cm-room"
                className="input"
                value={form.room}
                onChange={(e) => set("room", e.target.value)}
                placeholder="e.g. Bldg 3 - Room 204"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="cm-start">Start Time *</label>
              <input
                id="cm-start"
                className="input"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="cm-end">End Time *</label>
              <input
                id="cm-end"
                className="input"
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </div>
          </div>

          {timeInvalid && (form.startTime || form.endTime) && (
            <p className="form-error">End time must be later than start time.</p>
          )}

          <div className="field">
            <span className="field-label">Color</span>
            <div className="color-picker">
              <button
                type="button"
                className={`swatch auto${form.colorOverride === null ? " selected" : ""}`}
                style={{
                  background:
                    "linear-gradient(135deg,#FDE68A,#FCA5A5,#86EFAC,#93C5FD,#D8B4FE,#FDBA74)",
                  color: "#111827",
                }}
                onClick={pickAuto}
                aria-label="Auto color"
                title="Auto color (same for every block of this course)"
              >
                A
              </button>
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`swatch${
                    form.colorOverride === c.hex ? " selected" : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => pickPalette(c.hex)}
                  aria-label={c.name}
                  title={c.name}
                />
              ))}
              <button
                type="button"
                className={`swatch custom${customColor ? " selected" : ""}`}
                style={{ backgroundColor: customColor ? customHex : "var(--bg-grid-cell)" }}
                onClick={() => setCustomColor((v) => !v)}
                aria-label="Custom color"
                title="Custom color"
              >
                +
              </button>
            </div>
            {customColor && (
              <div className="custom-color-row">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => applyCustomColor(e.target.value)}
                  aria-label="Custom color picker"
                />
                <input
                  type="text"
                  className="input"
                  value={customHex}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setCustomHex(v.startsWith("#") ? v : `#${v}`);
                  }}
                  onBlur={() => applyCustomColor(customHex)}
                  placeholder="#RRGGBB"
                  aria-label="Custom color hex"
                />
              </div>
            )}
            {colorError && <p className="form-error">{colorError}</p>}
            <p className="color-hint">
              {form.colorOverride === null
                ? `Auto — every block of this course uses ${displayColor}`
                : "Manual override — applies to every block of this course."}
            </p>
            <div
              className="color-preview"
              style={{ backgroundColor: displayColor, color: textColor }}
            >
              {form.title || form.code ? <span>Aa</span> : <span>Preview</span>}
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="conflict-warning" role="alert">
              <strong>
                <Icon name="alert" size={14} /> Overlaps with:
              </strong>
              <ul>
                {conflicts.map((c) => (
                  <li key={c.id}>
                    {c.code} – {c.title} ({DAY_SHORT[c.day]},{" "}
                    {formatTime12(c.startTime)}–{formatTime12(c.endTime)})
                  </li>
                ))}
              </ul>
              <label className="add-anyway">
                <input
                  type="checkbox"
                  checked={addAnyway}
                  onChange={(e) => setAddAnyway(e.target.checked)}
                />
                Add anyway (will show side-by-side)
              </label>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          {editing && (
            <button
              type="button"
              className="btn-destructive"
              onClick={() => onDelete(course!.id)}
            >
              <Icon name="trash" size={15} />
              Delete
            </button>
          )}
          <div className="footer-spacer" />
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            data-default-focus
            disabled={savingBlocked}
          >
            <Icon name="check" size={15} />
            {editing ? "Save" : "Add"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
