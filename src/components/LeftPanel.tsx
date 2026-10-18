import { useEffect, useRef, useState } from "react";
import type { CourseEntry, ScheduleBreak } from "../types";
import { DAY_LABELS } from "../types";
import CourseList from "./CourseList";
import Icon from "./icons";
import { courseGroupKey } from "../utils/colors";
import { GOOGLE_CALENDAR_EXPORT_URL } from "../utils/gcal";

interface LeftPanelProps {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  open: boolean;
  onCloseSidebar: () => void;
  onAdd: () => void;
  onLoadDemo: () => void;
  onClearAll: () => void;
  onEdit: (course: CourseEntry) => void;
  onDelete: (course: CourseEntry) => void;
  onDuplicateGroup: (courses: CourseEntry[]) => void;
  onExportIcs: () => void;
  onOpenGemini: () => void;
  onOpenCompare: () => void;
  onRequestBackup: () => void;
  onRequestIcs: () => void;
  onDownloadBackup: () => void;
}

export default function LeftPanel({
  courses,
  breaks,
  open,
  onCloseSidebar,
  onAdd,
  onLoadDemo,
  onClearAll,
  onEdit,
  onDelete,
  onDuplicateGroup,
  onExportIcs,
  onOpenGemini,
  onOpenCompare,
  onRequestBackup,
  onRequestIcs,
  onDownloadBackup,
}: LeftPanelProps) {
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLElement | null>(null);

  // Keep the closed drawer out of the tab order and the a11y tree.
  useEffect(() => {
    if (panelRef.current) panelRef.current.inert = !open;
  }, [open]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCloseSidebar]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? courses.filter((c) =>
        [c.title, c.code, c.instructor, c.room, c.section ?? "", DAY_LABELS[c.day]]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : courses;

  return (
    <aside
      id="left-panel"
      ref={panelRef}
      className={`left-panel${open ? " open" : ""}`}
      aria-label="Course manager"
    >
      <header className="lp-panel-head">
        <h2 className="lp-panel-title">Courses</h2>
        <span className="count-badge">{courses.length}</span>
        <button
          type="button"
          className="icon-btn lp-panel-close"
          onClick={onCloseSidebar}
          aria-label="Close course panel"
        >
          <Icon name="x" size={18} />
        </button>
      </header>

      <div className="lp-panel-tools">
        {courses.length > 0 && (
          <div className="course-search">
            <Icon name="search" size={14} aria-hidden="true" />
            <input
              type="search"
              className="input course-search__input"
              placeholder="Search title, code, room, day…"
              aria-label="Search classes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                className="course-search__clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className="btn-primary add-cta lp-panel-add"
          onClick={() => {
            onAdd();
            onCloseSidebar();
          }}
        >
          <Icon name="plus" size={16} />
          Add class
        </button>
      </div>

      <div className="lp-panel-scroll">
        <CourseList
          courses={filtered}
          breaks={breaks}
          query={query}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={(course) => {
            const key = courseGroupKey(course);
            onDuplicateGroup(courses.filter((c) => courseGroupKey(c) === key));
          }}
        />
      </div>

      <footer className="lp-panel-foot">
        <details className="lp-sync">
          <summary className="lp-sync__summary">
            <span>Import &amp; sync</span>
            <Icon name="chevron-right" size={15} className="lp-sync__chev" />
          </summary>
          <div className="lp-sync__body">
            <button
              type="button"
              className="btn-ghost integration-btn integration-primary"
              onClick={onOpenGemini}
            >
              <Icon name="sparkles" size={15} />
              Import from Gemini AI
            </button>
            <button
              type="button"
              className="btn-ghost integration-btn"
              onClick={onOpenCompare}
            >
              <Icon name="sliders" size={15} />
              Compare two sections
            </button>
            <a
              className="btn-ghost integration-btn"
              href={GOOGLE_CALENDAR_EXPORT_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="download" size={15} />
              Get courses from Google Calendar
              <Icon name="external" size={13} className="btn-trailing" />
            </a>
            <button
              type="button"
              className="btn-ghost integration-btn"
              onClick={onRequestIcs}
            >
              <Icon name="calendar" size={15} />
              Import .ics file
            </button>
            <button
              type="button"
              className="btn-ghost integration-btn"
              onClick={onExportIcs}
              disabled={courses.length === 0}
            >
              <Icon name="upload" size={15} />
              Export to Google Calendar
            </button>
            <div className="integration-subrow">
              <button type="button" className="btn-link" onClick={onDownloadBackup}>
                Download backup
              </button>
              <button type="button" className="btn-link" onClick={onRequestBackup}>
                Restore backup
              </button>
            </div>
          </div>
        </details>

        <div className="panel-actions">
          <button type="button" className="btn-ghost" onClick={onLoadDemo}>
            <Icon name="sparkles" size={15} />
            Load Demo
          </button>
          {courses.length > 0 && (
            <button
              type="button"
              className="btn-destructive clear-all"
              onClick={onClearAll}
              title="Remove all classes"
            >
              <Icon name="trash" size={15} />
              Clear All
            </button>
          )}
        </div>
      </footer>
    </aside>
  );
}
