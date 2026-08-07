import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CourseEntry,
  ScheduleBreak,
  ScheduleSettings,
  SlotMinutes,
  TeacherTab,
  WeekDay,
} from "../types";
import {
  DEFAULT_SETTINGS,
  loadState,
  saveState,
} from "../utils/persistence";
import { buildDemoBreaks, buildDemoCourses } from "../data/demo";
import { assignUniqueColors, courseGroupKey } from "../utils/colors";
import { detectSlotMinutes } from "../utils/time";

export type ToastKind = "success" | "danger" | "info";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
}

const MAX_HISTORY = 20;

export function useSchedule() {
  const [initial] = useState(loadState);

  const [tabs, setTabs] = useState<TeacherTab[]>(() => initial?.tabs ?? []);
  const [activeId, setActiveId] = useState<string | null>(
    () => initial?.activeId ?? null
  );
  const [settings, setSettings] = useState<ScheduleSettings>(() =>
    initial ? initial.settings : { ...DEFAULT_SETTINGS }
  );

  // Guard: keep at least one tab so there is always a "current schedule".
  const safeTabs: TeacherTab[] = useMemo(() => {
    if (tabs.length > 0) return tabs;
    return [
      { id: "tab-solo", name: "My Schedule", courses: [], breaks: [] } satisfies TeacherTab,
    ];
  }, [tabs]);

  const activeTab: TeacherTab | undefined = useMemo(
    () => safeTabs.find((t) => t.id === activeId) ?? safeTabs[0],
    [safeTabs, activeId]
  );

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toothId = useRef(0);

  const courses = activeTab?.courses ?? [];
  const breaks = activeTab?.breaks ?? [];

  useEffect(() => {
  if (!activeTab || !safeTabs.length) return;
  saveState({ settings, tabs: safeTabs, activeId: activeTab.id });
}, [settings, safeTabs, activeTab]);

  // Theme on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++toothId.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  // ---- Helpers to mutate the active tab ----
  const setActiveTabCourses = useCallback(
    (next: CourseEntry[]) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab?.id ? { ...t, courses: next } : t
        )
      );
    },
    [activeTab?.id]
  );
  const setActiveTabBreaks = useCallback(
    (next: ScheduleBreak[]) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab?.id ? { ...t, breaks: next } : t))
      );
    },
    [activeTab?.id]
  );
  const activeTabIdRef = useRef(activeTab?.id);
  activeTabIdRef.current = activeTab?.id;

  // ---- History (per active tab) ----
  const historyRef = useRef<CourseEntry[][]>([]);
  const futureRef = useRef<CourseEntry[][]>([]);
  const skipHistoryRef = useRef(false);

  const coursesRef = useRef(courses);
  coursesRef.current = courses;

  const resetHistoryForTab = useCallback(() => {
    historyRef.current = [];
    futureRef.current = [];
  }, []);

  const switchTab = useCallback(
    (id: string) => {
      if (!tabs.some((t) => t.id === id)) return;
      resetHistoryForTab();
      setActiveId(id);
    },
    [tabs, resetHistoryForTab]
  );

  const addTab = useCallback(() => {
    const id = crypto.randomUUID();
    const count = safeTabs.length + 1;
    const name = `Section ${count}`;
    const next: TeacherTab = { id, name, courses: [], breaks: [] };
    setTabs((prev) => [...prev, next]);
    setActiveId(id);
    resetHistoryForTab();
    pushToast({ message: `Added "${name}"`, kind: "success" });
  }, [safeTabs.length, resetHistoryForTab, pushToast]);

  const renameTab = useCallback((id: string, name: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const removeTab = useCallback(
    (id: string) => {
      if (safeTabs.length <= 1) return;
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeTabIdRef.current === id) {
          setActiveId(next[0]?.id ?? null);
        }
        return next;
      });
      resetHistoryForTab();
    },
    [safeTabs.length, resetHistoryForTab]
  );

  // ---- Course CRUD (active tab) ----
  const addCourse = useCallback(
    (course: CourseEntry) => {
      setActiveTabCourses([...coursesRef.current, course]);
      pushToast({ message: `Added "${course.title}"`, kind: "success" });
    },
    [setActiveTabCourses, pushToast]
  );

  const updateCourse = useCallback(
    (updated: CourseEntry) => {
      setActiveTabCourses(coursesRef.current.map((c) => (c.id === updated.id ? updated : c)));
      pushToast({ message: `Updated "${updated.title}"`, kind: "success" });
    },
    [setActiveTabCourses, pushToast]
  );

  const deleteCourse = useCallback(
    (id: string) => {
      const target = coursesRef.current.find((c) => c.id === id);
      setActiveTabCourses(coursesRef.current.filter((c) => c.id !== id));
      if (target) {
        pushToast({
          message: `Deleted "${target.title}"`,
          kind: "danger",
          actionLabel: "Undo",
          onAction: () => {
            skipHistoryRef.current = true;
            addCourse(target);
          },
        });
      }
    },
    [setActiveTabCourses, pushToast, addCourse]
  );

  const deleteCourseGroup = useCallback(
    (key: string) => {
      const matching = coursesRef.current.filter((c) => courseGroupKey(c) === key);
      if (matching.length === 0) return;
      const target = matching[0];
      const next = coursesRef.current.filter((c) => courseGroupKey(c) !== key);
      const hadBreaks = breaks.length > 0;
      const prevBreaks = breaks;
      setActiveTabCourses(next);
      if (hadBreaks) setActiveTabBreaks([]);
      pushToast({
        message: `Deleted "${target.title || target.code}"`,
        kind: "danger",
        actionLabel: "Undo",
        onAction: () => {
          skipHistoryRef.current = true;
          setActiveTabCourses([...coursesRef.current, ...matching]);
          if (hadBreaks) setActiveTabBreaks(prevBreaks);
        },
      });
    },
    [setActiveTabCourses, setActiveTabBreaks, breaks, pushToast]
  );

  const clearAll = useCallback(() => {
    const count = coursesRef.current.length;
    const hadBreaks = breaks.length;
    if (count === 0 && hadBreaks === 0) return;
    const prevBreaks = breaks;
    setActiveTabCourses([]);
    if (hadBreaks) setActiveTabBreaks([]);
    if (settings.slotMinutes !== 30) setSettings((prev) => ({ ...prev, slotMinutes: 30 }));
    pushToast({
      message:
        count > 0
          ? `Cleared ${count} class${count === 1 ? "" : "es"}${hadBreaks > 0 ? ` and ${hadBreaks} break${hadBreaks === 1 ? "" : "s"}` : ""}`
          : `Cleared ${hadBreaks} break${hadBreaks === 1 ? "" : "s"}`,
      kind: "danger",
      actionLabel: "Undo",
      onAction: () => {
        skipHistoryRef.current = true;
        setActiveTabCourses(historyRef.current[historyRef.current.length - 1] ?? []);
        if (hadBreaks) setActiveTabBreaks(prevBreaks);
      },
    });
  }, [setActiveTabCourses, setActiveTabBreaks, breaks, settings.slotMinutes, pushToast]);

  const loadDemo = useCallback(() => {
    skipHistoryRef.current = true;
    historyRef.current.push(coursesRef.current);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    futureRef.current = [];
    setActiveTabCourses(buildDemoCourses());
    setActiveTabBreaks(buildDemoBreaks());
    setSettings((prev) => ({ ...prev, slotMinutes: 30 }));
    pushToast({ message: "Loaded demo schedule", kind: "success" });
  }, [setActiveTabCourses, setActiveTabBreaks, pushToast]);

  const importCourses = useCallback(
    (imported: CourseEntry[], label: string) => {
      skipHistoryRef.current = true;
      historyRef.current.push(coursesRef.current);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      futureRef.current = [];
      setActiveTabCourses(imported);
      pushToast({ message: `Imported ${label}`, kind: "success" });
    },
    [setActiveTabCourses, pushToast]
  );

  const mergeCourses = useCallback(
    (incoming: CourseEntry[], label: string) => {
      skipHistoryRef.current = true;
      historyRef.current.push(coursesRef.current);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      futureRef.current = [];
      const colored = assignUniqueColors(incoming, coursesRef.current);
      setActiveTabCourses([...coursesRef.current, ...colored]);
      pushToast({
        message: `Added ${incoming.length} class${incoming.length === 1 ? "" : "es"} from ${label}`,
        kind: "success",
      });
    },
    [setActiveTabCourses, pushToast]
  );

  const addBreak = useCallback(
    (br: ScheduleBreak) => {
      setActiveTabBreaks([...breaks, br]);
    },
    [setActiveTabBreaks, breaks]
  );
  const updateBreak = useCallback(
    (id: string, patch: Partial<ScheduleBreak>) => {
      setActiveTabBreaks(breaks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [setActiveTabBreaks, breaks]
  );
  const deleteBreak = useCallback(
    (id: string) => {
      setActiveTabBreaks(breaks.filter((b) => b.id !== id));
    },
    [setActiveTabBreaks, breaks]
  );

  const importSchedule = useCallback(
    (incoming: CourseEntry[], newBreaks: ScheduleBreak[], label: string, slotMinutes?: SlotMinutes) => {
      skipHistoryRef.current = true;
      historyRef.current.push(coursesRef.current);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      futureRef.current = [];
      const colored = assignUniqueColors(incoming, []);
      const detected = detectSlotMinutes(colored, slotMinutes ?? settings.slotMinutes);
      const slot: SlotMinutes = typeof slotMinutes === "number" && slotMinutes > 0 ? slotMinutes : detected;
      setActiveTabCourses(colored);
      setActiveTabBreaks(newBreaks);
      if (slot !== settings.slotMinutes) setSettings((prev) => ({ ...prev, slotMinutes: slot }));
      pushToast({
        message: `Imported ${colored.length} class${colored.length === 1 ? "" : "es"} and ${newBreaks.length} break${newBreaks.length === 1 ? "" : "s"} from ${label}`,
        kind: "success",
      });
    },
    [setActiveTabCourses, setActiveTabBreaks, settings.slotMinutes, pushToast]
  );

  const applyCourseColor = useCallback(
    (key: string, override: string | null) => {
      skipHistoryRef.current = true;
      setActiveTabCourses(
        coursesRef.current.map((c) =>
          courseGroupKey(c) === key
            ? { ...c, colorOverride: override ?? undefined, updatedAt: Date.now() }
            : c
        )
      );
    },
    [setActiveTabCourses]
  );

  const saveCourseGroup = useCallback(
    (
      base: Omit<CourseEntry, "id" | "day" | "createdAt" | "updatedAt">,
      days: WeekDay[],
      editingKey: string | null
    ) => {
      const others = editingKey
        ? coursesRef.current.filter((c) => courseGroupKey(c) !== editingKey)
        : coursesRef.current;
      const now = Date.now();
      const created = days.map((day, i) => ({
        ...base,
        id: crypto.randomUUID(),
        day,
        createdAt: now + i,
        updatedAt: editingKey ? now : undefined,
      }));
      setActiveTabCourses([...others, ...created]);
      pushToast({
        message: `Saved "${base.title || base.code}" on ${days.length} day${days.length === 1 ? "" : "s"}`,
        kind: "success",
      });
    },
    [setActiveTabCourses, pushToast]
  );

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (previous === undefined) return;
    futureRef.current.push(coursesRef.current);
    setActiveTabCourses(previous);
  }, [setActiveTabCourses]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next === undefined) return;
    historyRef.current.push(coursesRef.current);
    setActiveTabCourses(next);
  }, [setActiveTabCourses]);

  const canUndo = useMemo(() => historyRef.current.length > 0, [courses]);
  const canRedo = useMemo(() => futureRef.current.length > 0, [courses]);

  const updateSettings = useCallback((patch: Partial<ScheduleSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleDay = useCallback((day: WeekDay) => {
    setSettings((prev) => {
      const has = prev.activeDays.includes(day);
      const next = has
        ? prev.activeDays.filter((d) => d !== day)
        : [...prev.activeDays, day].sort(
            (a, b) => "MONTUEWEDTHUFRISATSUN".indexOf(a) - "MONTUEWEDTHUFRISATSUN".indexOf(b)
          );
      return { ...prev, activeDays: next };
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return {
    // Active schedule view (single tab when not in teacher mode).
    courses,
    breaks,
    settings,
    activeTab,
    tabs: safeTabs,
    activeTabId: activeTab?.id ?? null,
    // Tab management (teacher mode).
    selectTab: switchTab,
    addTab,
    renameTab,
    removeTab,
    toasts,
    canUndo,
    canRedo,
    addCourse,
    updateCourse,
    deleteCourse,
    deleteCourseGroup,
    clearAll,
    loadDemo,
    importCourses,
    mergeCourses,
    importSchedule,
    addBreak,
    updateBreak,
    deleteBreak,
    applyCourseColor,
    saveCourseGroup,
    undo,
    redo,
    updateSettings,
    toggleDay,
    dismissToast: (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    notify: pushToast,
  };
}

export type ScheduleApi = ReturnType<typeof useSchedule>;