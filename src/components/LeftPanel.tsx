import type { CourseEntry } from "../types";
import CourseList from "./CourseList";
import Icon from "./icons";
import { getAccessibleTextColor } from "../utils/contrast";
import { GOOGLE_CALENDAR_EXPORT_URL } from "../utils/gcal";

interface LeftPanelProps {
  courses: CourseEntry[];
  open: boolean;
  onCloseSidebar: () => void;
  onAdd: () => void;
  onLoadDemo: () => void;
  onClearAll: () => void;
  onEdit: (course: CourseEntry) => void;
  onDelete: (course: CourseEntry) => void;
  onExportIcs: () => void;
  onOpenGemini: () => void;
  onRequestIcs: () => void;
  onRequestBackup: () => void;
}

export default function LeftPanel({
  courses,
  open,
  onCloseSidebar,
  onAdd,
  onLoadDemo,
  onClearAll,
  onEdit,
  onDelete,
  onExportIcs,
  onOpenGemini,
  onRequestIcs,
  onRequestBackup,
}: LeftPanelProps) {
  const exportBackup = () => {
    const raw = localStorage.getItem("schedule_v1");
    if (!raw) {
      alert("Nothing to export yet.");
      return;
    }
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schedule-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className={`left-panel${open ? " open" : ""}`}>
      <div className="panel-header">
        <div className="brand-inline">
          <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            width="22"
            height="22"
          >
            <rect x="2" y="6" width="28" height="24" rx="5" fill="#FDE68A" />
            <circle cx="10" cy="21" r="2" fill="#78350F" />
            <circle cx="16" cy="21" r="2" fill="#78350F" />
            <circle cx="22" cy="21" r="2" fill="#78350F" />
          </svg>
          <strong>Slotly</strong>
        </div>
        <button
          type="button"
          className="icon-btn drawer-close"
          onClick={onCloseSidebar}
          aria-label="Close course panel"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="quick-actions">
        <button type="button" className="btn-primary add-cta" onClick={onAdd}>
          <Icon name="plus" size={16} />
          Add Class
        </button>
        <button type="button" className="btn-ghost" onClick={onLoadDemo}>
          <Icon name="sparkles" size={15} />
          Load Demo Data
        </button>
        {courses.length > 0 && (
          <button type="button" className="btn-destructive clear-all" onClick={onClearAll}>
            <Icon name="trash" size={15} />
            Clear All
          </button>
        )}
      </div>

      <div className="integrations">
        <h2>Import / Integrate</h2>
        <button type="button" className="btn-ghost integration-btn" onClick={onOpenGemini}>
          <Icon name="sparkles" size={15} />
          Import from Gemini AI
        </button>
        <button
          type="button"
          className="btn-ghost integration-btn"
          onClick={onRequestIcs}
        >
          <Icon name="file" size={15} />
          Import Google Calendar (.ics)
        </button>
        <a
          className="btn-ghost integration-btn"
          href={GOOGLE_CALENDAR_EXPORT_URL}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="download" size={15} />
          Get my study load (.ics)
          <Icon name="external" size={13} className="btn-trailing" />
        </a>
        <button
          type="button"
          className="btn-ghost integration-btn"
          onClick={onExportIcs}
          disabled={courses.length === 0}
        >
          <Icon name="upload" size={15} />
          Export to .ics (into Google Calendar)
        </button>
        <div className="integration-subrow">
          <button type="button" className="btn-link" onClick={exportBackup}>
            Export backup
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={onRequestBackup}
          >
            Import backup
          </button>
        </div>
      </div>

      <div className="list-header">
        <h2>Course List</h2>
        <span className="count-badge">{courses.length}</span>
      </div>

      <CourseList courses={courses} onEdit={onEdit} onDelete={onDelete} />

      <p className="color-legend">
        <span
          className="legend-swatch"
          style={{
            backgroundColor: "#93C5FD",
            color: getAccessibleTextColor("#93C5FD"),
          }}
        >
          Aa
        </span>
        Same course, same color. Tap “A” in the color picker to switch back to auto.
      </p>
    </aside>
  );
}
