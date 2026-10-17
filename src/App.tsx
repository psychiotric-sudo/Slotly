import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CourseEntry, CourseFormResult, ScheduleBreak, WeekDay } from "./types";
import { useSchedule } from "./hooks/useSchedule";
import { useImporters } from "./hooks/useImporters";
import { usePageMeta } from "./hooks/usePageMeta";
import TopBar from "./components/TopBar";
import LeftPanel from "./components/LeftPanel";
import ScheduleCanvas from "./components/ScheduleCanvas";
import CourseModal from "./components/CourseModal";
import DeleteModal from "./components/DeleteModal";
import SettingsDrawer from "./components/SettingsDrawer";
import GeminiModal from "./components/GeminiModal";
import GCalExportModal from "./components/GCalExportModal";
import ConflictsModal from "./components/ConflictsModal";
import ExportModal from "./components/ExportModal";
import TeacherTabs from "./components/TeacherTabs";
import RestoreModal from "./components/RestoreModal";
import ImportChoiceModal from "./components/ImportChoiceModal";
import Toasts from "./components/Toasts";
import Icon from "./components/icons";
import { courseGroupKey } from "./utils/colors";
import { findConflictPairs, layoutCourses } from "./utils/conflicts";
import { buildIcs, GOOGLE_CALENDAR_EXPORT_URL } from "./utils/gcal";
import { downloadBackup } from "./utils/backup";
import {
  SHARE_SESSION_KEY,
  copyText,
  createShareUrl,
  decodeShareToken,
} from "./utils/share";
import type { RestoredBackup } from "./utils/persistence";
import { WEEK_DAYS } from "./types";

export default function App() {
  usePageMeta("Slotly Planner", "noindex, nofollow");
  const api = useSchedule();
  const {
    courses,
    breaks,
    settings,
    toasts,
    canUndo,
    canRedo,
    deleteCourseGroup,
    clearAll,
    loadDemo,
    mergeCourses,
    duplicateCourses,
    mergeBackup,
    importSchedule,
    saveCourseGroup,
    updateCourse,
    undo,
    redo,
    updateSettings,
    dismissToast,
    notify,
    tabs: teacherTabs,
    activeTab: currentTab,
    selectTab: selectTeacherTab,
    addTab: addTeacherTab,
    renameTab: renameTeacherTab,
    removeTab: removeTeacherTab,
  } = api;

  const [editingCourse, setEditingCourse] = useState<CourseEntry | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CourseEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showGCalExport, setShowGCalExport] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    backup: RestoredBackup;
    fileName: string;
  } | null>(null);
  const [pendingIcs, setPendingIcs] = useState<{
    courses: CourseEntry[];
    fileName: string;
  } | null>(null);
  const [pendingShare, setPendingShare] = useState<{
    courses: CourseEntry[];
    breaks: ScheduleBreak[];
    slotMinutes?: number;
    tabName: string;
  } | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exporting, setExporting] = useState<"jpg" | "pdf" | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [gridZoom, setGridZoom] = useState(1);
  const [fabMenu, setFabMenu] = useState<"import" | "export" | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  const closeFab = () => {
    setFabOpen(false);
    setFabMenu(null);
  };

  const importers = useImporters({
    onIcsParsed: (incoming, fileName) => {
      if (courses.length === 0) {
        mergeCourses(incoming, fileName);
      } else {
        setPendingIcs({ courses: incoming, fileName });
      }
    },
    onRestoreBackup: (backup, fileName) =>
      setPendingRestore({ backup, fileName }),
    onError: (message) => notify({ message, kind: "danger" }),
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // A token parked by the /s/ page: open it once on mount, then clear the key
  // immediately (StrictMode re-runs effects; the second pass finds nothing).
  useEffect(() => {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(SHARE_SESSION_KEY);
      if (token) sessionStorage.removeItem(SHARE_SESSION_KEY);
    } catch {
      token = null;
    }
    if (!token) return;
    let alive = true;
    void (async () => {
      const data = await decodeShareToken(token);
      if (!alive) return;
      if (!data) {
        notify({ message: "That share link couldn't be opened.", kind: "danger" });
        return;
      }
      if (courses.length === 0) {
        importSchedule(data.courses, data.breaks, "a share link", data.slotMinutes);
      } else {
        setPendingShare(data);
      }
    })();
    return () => {
      alive = false;
    };
    // Mount-only: courses/notify are the initial snapshot by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    () =>
      layoutCourses(courses, breaks).filter((c) => c.conflictCount > 0 || c.overlapsBreak)
        .length,
    [courses, breaks]
  );

  const conflictPairs = useMemo(
    () => findConflictPairs(courses, breaks),
    [courses, breaks]
  );

  const highlightCourses = useCallback((ids: string[]) => {
    const timer = window.setTimeout(() => setHighlighted(new Set()), 2600);
    setHighlighted(new Set(ids));
    window.setTimeout(() => window.clearTimeout(timer), 2700);
  }, []);

  /** Shown days: weekdays Mon–Fri by default, plus any day that has a class. */
  const visibleDays = useMemo<WeekDay[]>(() => {
    const scheduled = new Set(courses.map((c) => c.day));
    const defaults = new Set(["MON", "TUE", "WED", "THU", "FRI"]);
    const base: WeekDay[] = settings.sundayFirst
      ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
      : WEEK_DAYS;
    return base.filter((d) => defaults.has(d) || scheduled.has(d));
  }, [courses, settings.sundayFirst]);

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
    setExportProgress(0);
    try {
      const data = {
        courses,
        breaks,
        activeDays: exportDays,
        startHour: settings.startHour,
        endHour: settings.endHour,
        slotMinutes: settings.slotMinutes,
        showBreaks: settings.showBreaks,
        simplifyExport: settings.simplifyExport,
        title: settings.teacherMode ? (currentTab?.name || "").trim() : undefined,
        theme: settings.exportTheme,
      };
      const { exportToJPG, exportToPDF } = await import("./lib/export");
      if (kind === "jpg") await exportToJPG(data, undefined, setExportProgress);
      else await exportToPDF(data, undefined, setExportProgress);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
      setExportProgress(null);
    }
  };

  const handleDownloadBackup = () => {
    if (!downloadBackup()) {
      notify({ message: "Nothing to back up yet.", kind: "info" });
    }
  };

  const handleCopyShareLink = async () => {
    if (courses.length === 0) {
      notify({ message: "Nothing to share yet — add a class first.", kind: "info" });
      return;
    }
    const url = await createShareUrl({
      courses,
      breaks,
      slotMinutes: settings.slotMinutes,
      tabName: settings.teacherMode ? currentTab?.name || "Shared schedule" : "My Schedule",
    });
    if (!url) {
      notify({ message: "Couldn't build a share link for this schedule.", kind: "danger" });
      return;
    }
    const copied = await copyText(url);
    if (copied) {
      notify({ message: "Share link copied — anyone with it can open this schedule.", kind: "success" });
    } else {
      window.prompt("Copying was blocked — copy this link by hand:", url);
    }
  };

  const exportIcs = () => {
    if (courses.length === 0) return;
    const ics = buildIcs(courses);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    if ("download" in HTMLAnchorElement.prototype) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "slotly-schedule.ics";
      document.body.appendChild(link);
      link.click();
      // Defer cleanup so the browser has time to actually start the download,
      // otherwise revoking the object URL can cancel it.
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1500);
    } else {
      // Older fallback for very old browsers.
      const msNav = navigator as Navigator & { msSaveBlob?: (blob: Blob, name: string) => void };
      msNav.msSaveBlob?.(blob, "slotly-schedule.ics");
    }
    notify({
      message: "Schedule downloaded — redirecting you to the Google Calendar import page.",
      kind: "info",
    });
    window.open(GOOGLE_CALENDAR_EXPORT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="app">
      <a className="skip-link" href="#schedule-main">
        Skip to timetable
      </a>
      <TopBar
        theme={settings.theme}
        onToggleTheme={() =>
          updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
        }
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onAdd={openAdd}
        sidebarOpen={sidebarOpen}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <main className="app-body">
        <LeftPanel
          courses={courses}
          breaks={breaks}
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
          onDuplicateGroup={duplicateCourses}
          onExportIcs={() => setShowGCalExport(true)}
          onOpenGemini={() => {
            setShowGemini(true);
            setSidebarOpen(false);
          }}
          onRequestBackup={importers.requestBackup}
          onRequestIcs={importers.requestIcs}
          onDownloadBackup={handleDownloadBackup}
        />

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <section className="schedule-section" id="schedule-main" tabIndex={-1}>
          {settings.teacherMode && (
            <TeacherTabs
              tabs={teacherTabs}
              activeId={currentTab?.id ?? null}
              onSelect={selectTeacherTab}
              onRename={renameTeacherTab}
              onAdd={addTeacherTab}
              onRemove={removeTeacherTab}
            />
          )}
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
                onClick={() => setShowExportModal(true)}
                disabled={exporting !== null || courses.length === 0}
              >
                <Icon name="download" size={16} />
                Export
              </button>
              <button
                type="button"
                className={`export-hint${conflictsCount > 0 ? " has-conflicts" : ""}`}
                onClick={() => setShowConflicts(true)}
                disabled={conflictsCount === 0}
                title={conflictsCount > 0 ? "Review clashes" : undefined}
              >
                {courses.length} class{courses.length === 1 ? "" : "es"}
                {conflictsCount > 0
                  ? ` · ${conflictsCount} overlap${conflictsCount === 1 ? "" : "s"}`
                  : ""}
              </button>
            </div>

          <div
            ref={scrollRef}
            className="schedule-scroll"
          >
            <ScheduleCanvas
              courses={courses}
              breaks={breaks}
              startHour={settings.startHour}
              endHour={settings.endHour}
              slotMinutes={settings.slotMinutes}
              activeDays={visibleDays}
              onEdit={openEdit}
              onMoveCourse={(course, day, startTime, endTime) =>
                updateCourse({ ...course, day, startTime, endTime, updatedAt: Date.now() })
              }
              zoom={gridZoom}
              showConflictBadges={settings.showConflictBadges}
              showBreaks={settings.showBreaks}
              simplifyView={settings.simplifyView}
              fitAllDays={settings.fitAllDays}
              fontSize={settings.fontSize}
              highlightedCourseIds={highlighted}
            />
          </div>
        </section>
      </main>

      <footer className="app-credit">
        <span>Created by</span>
        <a
          href="https://t.me/drnx64"
          target="_blank"
          rel="noopener noreferrer"
          className="app-credit-link"
        >
          @drnx64
        </a>
      </footer>

      <button
        type="button"
        className={`fab${fabOpen ? " open" : ""}`}
        onClick={() => {
          setFabOpen((v) => !v);
          setFabMenu(null);
        }}
        aria-label={fabOpen ? "Close quick actions" : "Quick actions"}
        aria-expanded={fabOpen}
      >
        <Icon name={fabOpen ? "x" : "plus"} size={26} />
      </button>

      {fabOpen && (
        <>
          <div className="fab-backdrop" onClick={closeFab} />
          <div className="fab-menu" role="menu" aria-label="Quick actions">
            {fabMenu === "import" ? (
              <div key="import" className="fab-menu-sub">
                <button
                  type="button"
                  className="fab-menu-back"
                  role="menuitem"
                  onClick={() => setFabMenu(null)}
                >
                  <Icon name="chevron-right" size={16} className="fab-back-chev" />
                  Import
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
                    setShowGemini(true);
                  }}
                >
                  <Icon name="sparkles" size={18} />
                  From Gemini AI
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
                    importers.requestIcs();
                  }}
                >
                  <Icon name="calendar" size={18} />
                  From .ics file
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
                    importers.requestBackup();
                  }}
                >
                  <Icon name="upload" size={18} />
                  Restore backup
                </button>
              </div>
            ) : fabMenu === "export" ? (
              <div key="export" className="fab-menu-sub">
                <button
                  type="button"
                  className="fab-menu-back"
                  role="menuitem"
                  onClick={() => setFabMenu(null)}
                >
                  <Icon name="chevron-right" size={16} className="fab-back-chev" />
                  Export
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
                    setShowGCalExport(true);
                  }}
                >
                  <Icon name="calendar" size={18} />
                  To Google Calendar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
                    handleDownloadBackup();
                  }}
                >
                  <Icon name="download" size={18} />
                  Download backup
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
                    void handleCopyShareLink();
                  }}
                >
                  <Icon name="link" size={18} />
                  Copy share link
                </button>
                <a
                  className="fab-menu-link"
                  role="menuitem"
                  href={GOOGLE_CALENDAR_EXPORT_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeFab}
                >
                  <Icon name="download" size={18} />
                  Get my study load from Google Calendar
                  <Icon name="external" size={13} className="btn-trailing" />
                </a>
              </div>
            ) : (
              <div key="root" className="fab-menu-sub">
                <button
                  type="button"
                  className="fab-menu-add"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
                    openAdd();
                  }}
                >
                  <Icon name="plus" size={18} />
                  Add Class
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setFabMenu("import")}
                >
                  <Icon name="file" size={18} />
                  Import
                  <Icon name="chevron-right" size={15} className="btn-trailing" />
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setFabMenu("export")}
                >
                  <Icon name="calendar" size={18} />
                  Export
                  <Icon name="chevron-right" size={15} className="btn-trailing" />
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeFab();
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
                    closeFab();
                    clearAll();
                  }}
                >
                  <Icon name="trash" size={18} />
                  Clear All
                </button>
              </div>
            )}
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

      {showExportModal && (
        <ExportModal
          theme={settings.exportTheme}
          disabled={exporting !== null || courses.length === 0}
          onThemeChange={(theme) => updateSettings({ exportTheme: theme })}
          onExport={(kind) => {
            setShowExportModal(false);
            handleExport(kind);
          }}
          onCopyShareLink={() => {
            setShowExportModal(false);
            void handleCopyShareLink();
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showSettings && (
        <SettingsDrawer
          settings={settings}
          breaks={breaks}
          onUpdate={updateSettings}
          onAddBreak={api.addBreak}
          onUpdateBreak={api.updateBreak}
          onDeleteBreak={api.deleteBreak}
          onClose={() => setShowSettings(false)}
          onResetDemo={() => {
            loadDemo();
            setShowSettings(false);
          }}
        />
      )}

      {pendingRestore && (
        <RestoreModal
          fileName={pendingRestore.fileName}
          tabName={pendingRestore.backup.tabName}
          courseCount={pendingRestore.backup.courses.length}
          breakCount={pendingRestore.backup.breaks.length}
          onMerge={() => {
            mergeBackup(
              pendingRestore.backup.courses,
              pendingRestore.backup.breaks,
              pendingRestore.fileName
            );
            setPendingRestore(null);
          }}
          onReplace={() => {
            importSchedule(
              pendingRestore.backup.courses,
              pendingRestore.backup.breaks,
              pendingRestore.fileName,
              pendingRestore.backup.settings.slotMinutes
            );
            setPendingRestore(null);
          }}
          onClose={() => setPendingRestore(null)}
        />
      )}

      {pendingIcs && (
        <ImportChoiceModal
          sourceLabel={pendingIcs.fileName}
          courseCount={pendingIcs.courses.length}
          breakCount={0}
          existingCount={courses.length}
          onMerge={() => {
            mergeCourses(pendingIcs.courses, pendingIcs.fileName);
            setPendingIcs(null);
          }}
          onReplace={() => {
            importSchedule(pendingIcs.courses, [], pendingIcs.fileName);
            setPendingIcs(null);
          }}
          onClose={() => setPendingIcs(null)}
        />
      )}

      {pendingShare && (
        <ImportChoiceModal
          sourceLabel={`"${pendingShare.tabName}" (shared link)`}
          courseCount={pendingShare.courses.length}
          breakCount={pendingShare.breaks.length}
          existingCount={courses.length}
          onMerge={() => {
            mergeBackup(pendingShare.courses, pendingShare.breaks, "a share link");
            setPendingShare(null);
          }}
          onReplace={() => {
            importSchedule(
              pendingShare.courses,
              pendingShare.breaks,
              "a share link",
              pendingShare.slotMinutes
            );
            setPendingShare(null);
          }}
          onClose={() => setPendingShare(null)}
        />
      )}

      {showGemini && (
        <GeminiModal
          onImport={importSchedule}
          onMerge={mergeBackup}
          existingCourseCount={courses.length}
          onClose={() => setShowGemini(false)}
        />
      )}

      {showGCalExport && (
        <GCalExportModal
          onDownload={exportIcs}
          onClose={() => setShowGCalExport(false)}
        />
      )}

      {showConflicts && (
        <ConflictsModal
          pairs={conflictPairs}
          onDrop={(course) => deleteCourseGroup(courseGroupKey(course))}
          onHighlight={highlightCourses}
          onClose={() => setShowConflicts(false)}
        />
      )}

      {exporting && (
        <div className="export-overlay" role="status" aria-live="polite">
          <div className="export-progress">
            <span className="export-progress__title">
              Rendering {exporting.toUpperCase()}…
            </span>
            <div className="export-progress__track">
              <div
                className="export-progress__bar"
                style={{ width: `${exportProgress ?? 0}%` }}
              />
            </div>
            <span className="export-progress__pct">{exportProgress ?? 0}%</span>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
