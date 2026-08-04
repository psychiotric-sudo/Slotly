import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CourseEntry, CourseFormResult, WeekDay } from "./types";
import { useSchedule } from "./hooks/useSchedule";
import { useImporters } from "./hooks/useImporters";
import TopBar from "./components/TopBar";
import LeftPanel from "./components/LeftPanel";
import ScheduleCanvas from "./components/ScheduleCanvas";
import CourseModal from "./components/CourseModal";
import DeleteModal from "./components/DeleteModal";
import SettingsDrawer from "./components/SettingsDrawer";
import GeminiModal from "./components/GeminiModal";
import Toasts from "./components/Toasts";
import Icon from "./components/icons";
import { courseGroupKey } from "./utils/colors";
import { layoutCourses } from "./utils/conflicts";
import { buildIcs, GOOGLE_CALENDAR_EXPORT_URL } from "./utils/gcal";
import { DAY_SHORT, WEEK_DAYS } from "./types";

export default function App() {
  const api = useSchedule();
  const {
    courses,
    settings,
    toasts,
    canUndo,
    canRedo,
    deleteCourseGroup,
    clearAll,
    loadDemo,
    mergeCourses,
    saveCourseGroup,
    undo,
    redo,
    updateSettings,
    dismissToast,
    notify,
  } = api;

  const [editingCourse, setEditingCourse] = useState<CourseEntry | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CourseEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WeekDay>("MON");
  const [exporting, setExporting] = useState<"jpg" | "pdf" | null>(null);
  const [gridZoom, setGridZoom] = useState(1);
  const [fabOpen, setFabOpen] = useState(false);

  const importers = useImporters(mergeCourses);

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridZoomRef = useRef(gridZoom);
  gridZoomRef.current = gridZoom;
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  const MIN_ZOOM = 0.6;
  const MAX_ZOOM = 3;
  const clampZoom = useCallback(
    (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)),
    []
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDist: distance(e.touches[0], e.touches[1]),
          startZoom: gridZoomRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const p = pinchRef.current;
      if (p && e.touches.length === 2) {
        e.preventDefault();
        const d = distance(e.touches[0], e.touches[1]);
        if (d > 0) setGridZoom(clampZoom(p.startZoom * (d / p.startDist)));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setGridZoom(clampZoom(gridZoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9)));
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [clampZoom]);

  const conflictsCount = useMemo(
    () => layoutCourses(courses).filter((c) => c.conflictCount > 0).length,
    [courses]
  );

  /** Shown days: weekdays Mon–Fri by default, plus any day that has a class. */
  const visibleDays = useMemo(() => {
    const scheduled = new Set(courses.map((c) => c.day));
    const defaults = new Set(["MON", "TUE", "WED", "THU", "FRI"]);
    return WEEK_DAYS.filter((d) => defaults.has(d) || scheduled.has(d));
  }, [courses]);

  /** Export only shows days that actually have a class. */
  const exportDays = useMemo(
    () => visibleDays.filter((d) => courses.some((c) => c.day === d)),
    [visibleDays, courses]
  );

  const openAdd = () => {
    setEditingCourse(null);
    setEditingKey(null);
    setShowModal(true);
    setSidebarOpen(false);
  };

  const openEdit = (course: CourseEntry) => {
    setEditingCourse(course);
    setEditingKey(courseGroupKey(course));
    setShowModal(true);
  };

  const handleSave = (result: CourseFormResult) => {
    saveCourseGroup(result.base, result.days, result.editingKey);
    setShowModal(false);
  };

  const handleExport = async (kind: "jpg" | "pdf") => {
    if (courses.length === 0) return;
    setExporting(kind);
    try {
      const data = {
        courses,
        activeDays: exportDays,
        startHour: settings.startHour,
        endHour: settings.endHour,
        slotMinutes: settings.slotMinutes,
      };
      const { exportToJPG, exportToPDF } = await import("./lib/export");
      if (kind === "jpg") await exportToJPG(data);
      else await exportToPDF(data);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  const exportIcs = () => {
    if (courses.length === 0) return;
    const ics = buildIcs(courses);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "slotly-schedule.ics";
    link.click();
    URL.revokeObjectURL(url);
    notify({
      message: "Downloaded slotly-schedule.ics — import it in Google Calendar to add all classes.",
      kind: "info",
    });
  };

  const scrollToDay = (day: WeekDay) => {
    const container = scrollRef.current;
    if (!container) return;
    const header = container.querySelector<HTMLElement>(`[data-day-header="${day}"]`);
    if (!header) return;
    const containerRect = container.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const left = headerRect.left - containerRect.left + container.scrollLeft;
    container.scrollTo({ left, behavior: "smooth" });
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const headers = Array.from(
      container.querySelectorAll<HTMLElement>("[data-day-header]")
    );
    if (headers.length === 0) return;
    const anchor = container.getBoundingClientRect().left + 76;
    let best = headers[0].dataset.dayHeader as WeekDay;
    let bestDist = Infinity;
    for (const h of headers) {
      const dist = Math.abs(h.getBoundingClientRect().left - anchor);
      if (dist < bestDist) {
        bestDist = dist;
        best = h.dataset.dayHeader as WeekDay;
      }
    }
    if (best !== activeTab) setActiveTab(best);
  };

  return (
    <div className="app">
      <TopBar
        theme={settings.theme}
        onToggleTheme={() =>
          updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
        }
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <main className="app-body">
        <LeftPanel
          courses={courses}
          open={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onAdd={openAdd}
          onLoadDemo={() => {
            loadDemo();
            setSidebarOpen(false);
          }}
          onClearAll={clearAll}
          onEdit={(course) => {
            openEdit(course);
            setSidebarOpen(false);
          }}
          onDelete={(course) => setPendingDelete(course)}
          onExportIcs={exportIcs}
          onOpenGemini={() => {
            setShowGemini(true);
            setSidebarOpen(false);
          }}
          onRequestIcs={importers.requestIcs}
          onRequestBackup={importers.requestBackup}
        />

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <section className="schedule-section">
          <div className="day-tab-strip" role="tablist" aria-label="Jump to day">
            {visibleDays.map((day) => (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={activeTab === day}
                className={`day-tab${activeTab === day ? " active" : ""}`}
                onClick={() => scrollToDay(day)}
              >
                {DAY_SHORT[day]}
              </button>
            ))}
          </div>

          <div
            ref={scrollRef}
            className="schedule-scroll"
            onScroll={handleScroll}
          >
            <ScheduleCanvas
              courses={courses}
              startHour={settings.startHour}
              endHour={settings.endHour}
              slotMinutes={settings.slotMinutes}
              activeDays={visibleDays}
              onEdit={openEdit}
              zoom={gridZoom}
            />
          </div>

          <div className="export-bar">
            <div className="zoom-controls" role="group" aria-label="Zoom timetable">
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setGridZoom((z) => clampZoom(z / 1.2))}
                aria-label="Zoom out"
                title="Zoom out"
              >
                −
              </button>
              <span className="zoom-label">{Math.round(gridZoom * 100)}%</span>
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setGridZoom((z) => clampZoom(z * 1.2))}
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleExport("jpg")}
              disabled={exporting !== null || courses.length === 0}
            >
              {exporting === "jpg" ? "Rendering…" : "Export JPG"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null || courses.length === 0}
            >
              {exporting === "pdf" ? "Rendering…" : "Export PDF"}
            </button>
            <span className="export-hint">
              {courses.length} class{courses.length === 1 ? "" : "es"}
              {conflictsCount > 0
                ? ` · ${conflictsCount} overlap${conflictsCount === 1 ? "" : "s"}`
                : ""}
            </span>
          </div>
        </section>
      </main>

      <button
        type="button"
        className={`fab${fabOpen ? " open" : ""}`}
        onClick={() => setFabOpen((v) => !v)}
        aria-label={fabOpen ? "Close quick actions" : "Quick actions"}
        aria-expanded={fabOpen}
      >
        <Icon name={fabOpen ? "x" : "plus"} size={26} />
      </button>

      {fabOpen && (
        <>
          <div className="fab-backdrop" onClick={() => setFabOpen(false)} />
          <div className="fab-menu" role="menu" aria-label="Quick actions">
            <button
              type="button"
              className="fab-menu-add"
              role="menuitem"
              onClick={() => {
                setFabOpen(false);
                openAdd();
              }}
            >
              <Icon name="plus" size={18} />
              Add Class
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setFabOpen(false);
                setShowGemini(true);
              }}
            >
              <Icon name="sparkles" size={18} />
              Import from Gemini AI
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setFabOpen(false);
                importers.requestIcs();
              }}
            >
              <Icon name="file" size={18} />
              Import Google Calendar (.ics)
            </button>
            <a
              className="fab-menu-link"
              role="menuitem"
              href={GOOGLE_CALENDAR_EXPORT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setFabOpen(false)}
            >
              <Icon name="download" size={18} />
              Get my study load (.ics)
              <Icon name="external" size={13} className="btn-trailing" />
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setFabOpen(false);
                importers.requestBackup();
              }}
            >
              <Icon name="upload" size={18} />
              Import backup
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setFabOpen(false);
                exportIcs();
              }}
            >
              <Icon name="calendar" size={18} />
              Export to .ics
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setFabOpen(false);
                loadDemo();
              }}
            >
              <Icon name="inbox" size={18} />
              Load Demo Data
            </button>
            <button
              type="button"
              role="menuitem"
              className="fab-menu-danger"
              onClick={() => {
                setFabOpen(false);
                clearAll();
              }}
            >
              <Icon name="trash" size={18} />
              Clear All
            </button>
          </div>
        </>
      )}

      <input
        ref={importers.icsRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importers.handleIcsFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={importers.backupRef}
        type="file"
        accept="application/json,.json"
        className="hidden-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importers.handleBackupFile(file);
          e.target.value = "";
        }}
      />

      {showModal && (
        <CourseModal
          course={editingCourse}
          editingKey={editingKey}
          allCourses={courses}
          onSave={handleSave}
          onDelete={(id) => {
            setShowModal(false);
            setPendingDelete(courses.find((c) => c.id === id) ?? null);
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {pendingDelete && (
        <DeleteModal
          title={`${pendingDelete.code} – ${pendingDelete.title}`}
          onConfirm={() => {
            if (pendingDelete) deleteCourseGroup(courseGroupKey(pendingDelete));
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}

      {showSettings && (
        <SettingsDrawer
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showGemini && (
        <GeminiModal
          onImport={mergeCourses}
          onClose={() => setShowGemini(false)}
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
