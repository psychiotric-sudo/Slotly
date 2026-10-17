import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CourseEntry,
  ScheduleBreak,
  ScheduleSettings,
  SlotMinutes,
  TeacherTab,
  WeekDay,
} from "../types";
import { DEFAULT_SETTINGS, loadState, saveState } from "../utils/persistence";
import { buildDemoBreaks, buildDemoCourses } from "../data/demo";
import { assignUniqueColors, courseGroupKey } from "../utils/colors";
import { detectSlotMinutes } from "../utils/time";
import { newId } from "../utils/id";

export type ToastKind = "success" | "danger" | "info";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
}

const MAX_HISTORY = 50;

interface HistorySnapshot {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  slotMinutes: SlotMinutes;
}

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
  const toastIdRef = useRef(0);

  const courses = activeTab?.courses ?? [];
  const breaks = activeTab?.breaks ?? [];

  // Theme on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const saveFailedToastRef = useRef(false);
  useEffect(() => {
    if (!activeTab || !safeTabs.length) return;
    const ok = saveState({ settings, tabs: safeTabs, activeId: activeTab.id });
    if (!ok && !saveFailedToastRef.current) {
      saveFailedToastRef.current = true;
      pushToast({
        message: "Couldn't save to this device's storage — changes may be lost.",
        kind: "danger",
      });
    }
  }, [settings, safeTabs, activeTab, pushToast]);

  // ---- Helpers to mutate the active tab ----
  const setActiveTabCourses = useCallback(
    (next: CourseEntry[]) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab?.id ? { ...t, courses: next } : t))
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

  // Latest-values refs (read inside callbacks so they never go stale).
  const coursesRef = useRef(courses);
  coursesRef.current = courses;
  const breaksRef = useRef(breaks);
  breaksRef.current = breaks;
  const slotRef = useRef(settings.slotMinutes);
  slotRef.current = settings.slotMinutes;

  // ---- History (per active tab; reset on tab switch) ----
  const historyRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  // Bumped whenever the stacks change so canUndo/canRedo stay reactive.
  const [histTick, setHistTick] = useState(0);

  const bumpHistory = useCallback(() => setHistTick((t) => t + 1), []);

  const snapshot = useCallback(
    (): HistorySnapshot => ({
      courses: coursesRef.current,
      breaks: breaksRef.current,
      slotMinutes: slotRef.current,
    }),
    []
  );

  // Call BEFORE a mutation so undo can restore the pre-mutation state.
  const pushHistory = useCallback(() => {
    historyRef.current.push(snapshot());
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    futureRef.current = [];
    bumpHistory();
  }, [snapshot, bumpHistory]);

  const applySnapshot = useCallback(
    (snap: HistorySnapshot) => {
      setActiveTabCourses(snap.courses);
      setActiveTabBreaks(snap.breaks);
      setSettings((prev) =>
        prev.slotMinutes === snap.slotMinutes
          ? prev
          : { ...prev, slotMinutes: snap.slotMinutes }
      );
    },
    [setActiveTabCourses, setActiveTabBreaks]
  );

  const resetHistoryForTab = useCallback(() => {
    historyRef.current = [];
    futureRef.current = [];
    bumpHistory();
  }, [bumpHistory]);

  const switchTab = useCallback(
    (id: string) => {
      if (!tabs.some((t) => t.id === id)) return;
      resetHistoryForTab();
      setActiveId(id);
    },
    [tabs, resetHistoryForTab]
  );

  const addTab = useCallback(() => {
    const id = newId();
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
      pushHistory();
      setActiveTabCourses([...coursesRef.current, course]);
      pushToast({ message: `Added "${course.title}"`, kind: "success" });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  const updateCourse = useCallback(
    (updated: CourseEntry) => {
      pushHistory();
      setActiveTabCourses(
        coursesRef.current.map((c) => (c.id === updated.id ? updated : c))
      );
      pushToast({ message: `Updated "${updated.title}"`, kind: "success" });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  const deleteCourse = useCallback(
    (id: string) => {
      const target = coursesRef.current.find((c) => c.id === id);
      if (!target) return;
      pushHistory();
      setActiveTabCourses(coursesRef.current.filter((c) => c.id !== id));
      pushToast({
        message: `Deleted "${target.title}"`,
        kind: "danger",
        actionLabel: "Undo",
        onAction: undo,
      });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  const deleteCourseGroup = useCallback(
    (key: string) => {
      const matching = coursesRef.current.filter((c) => courseGroupKey(c) === key);
      if (matching.length === 0) return;
      pushHistory();
      setActiveTabCourses(coursesRef.current.filter((c) => courseGroupKey(c) !== key));
      pushToast({
        message: `Deleted "${matching[0].title || matching[0].code}"`,
        kind: "danger",
        actionLabel: "Undo",
        onAction: undo,
      });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  const clearAll = useCallback(() => {
    const count = coursesRef.current.length;
    const breakCount = breaksRef.current.length;
    if (count === 0 && breakCount === 0) return;
    pushHistory();
    setActiveTabCourses([]);
    setActiveTabBreaks([]);
    if (slotRef.current !== 30) {
      setSettings((prev) => ({ ...prev, slotMinutes: 30 }));
    }
    pushToast({
      message:
        count > 0
          ? `Cleared ${count} class${count === 1 ? "" : "es"}${
              breakCount > 0
                ? ` and ${breakCount} break${breakCount === 1 ? "" : "s"}`
                : ""
            }`
          : `Cleared ${breakCount} break${breakCount === 1 ? "" : "s"}`,
      kind: "danger",
      actionLabel: "Undo",
      onAction: undo,
    });
  }, [pushHistory, setActiveTabCourses, setActiveTabBreaks, pushToast]);

  const loadDemo = useCallback(() => {
    pushHistory();
    setActiveTabCourses(buildDemoCourses());
    setActiveTabBreaks(buildDemoBreaks());
    setSettings((prev) => ({ ...prev, slotMinutes: 30 }));
    pushToast({ message: "Loaded demo schedule", kind: "success" });
  }, [pushHistory, setActiveTabCourses, setActiveTabBreaks, pushToast]);

  const importCourses = useCallback(
    (imported: CourseEntry[], label: string) => {
      pushHistory();
      setActiveTabCourses(imported);
      pushToast({ message: `Imported ${label}`, kind: "success" });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  const mergeCourses = useCallback(
    (incoming: CourseEntry[], label: string) => {
      pushHistory();
      const colored = assignUniqueColors(incoming, coursesRef.current);
      setActiveTabCourses([...coursesRef.current, ...colored]);
      pushToast({
        message: `Added ${incoming.length} class${incoming.length === 1 ? "" : "es"} from ${label}`,
        kind: "success",
      });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  // Clones course entries as NEW blocks (fresh ids) in one undo step.
  const duplicateCourses = useCallback(
    (incoming: CourseEntry[]) => {
      if (incoming.length === 0) return;
      pushHistory();
      const now = Date.now();
      const copies = incoming.map((c, i) => ({
        ...c,
        id: newId(),
        createdAt: now + i,
        updatedAt: undefined,
      }));
      setActiveTabCourses([...coursesRef.current, ...copies]);
      pushToast({
        message:
          copies.length === 1
            ? `Duplicated "${copies[0].title || copies[0].code}" — drag it to a new time`
            : `Duplicated ${copies.length} class blocks — drag them to a new time`,
        kind: "success",
      });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  const addBreak = useCallback(
    (br: ScheduleBreak) => {
      pushHistory();
      setActiveTabBreaks([...breaksRef.current, br]);
    },
    [pushHistory, setActiveTabBreaks]
  );
  const updateBreak = useCallback(
    (id: string, patch: Partial<ScheduleBreak>) => {
      pushHistory();
      setActiveTabBreaks(
        breaksRef.current.map((b) => (b.id === id ? { ...b, ...patch } : b))
      );
    },
    [pushHistory, setActiveTabBreaks]
  );
  const deleteBreak = useCallback(
    (id: string) => {
      pushHistory();
      setActiveTabBreaks(breaksRef.current.filter((b) => b.id !== id));
    },
    [pushHistory, setActiveTabBreaks]
  );

  // Merges a backup's courses + breaks into the active tab as ONE undo step,
// deduping breaks by label + time window.
  const mergeBackup = useCallback(
    (incoming: CourseEntry[], newBreaks: ScheduleBreak[], label: string) => {
      pushHistory();
      const colored = assignUniqueColors(incoming, coursesRef.current);
      setActiveTabCourses([...coursesRef.current, ...colored]);
      const seen = new Set(
        breaksRef.current.map((b) => `${b.label}|${b.startTime}|${b.endTime}`)
      );
      const fresh = newBreaks.filter((b) => {
        const sig = `${b.label}|${b.startTime}|${b.endTime}`;
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
      if (fresh.length > 0) setActiveTabBreaks([...breaksRef.current, ...fresh]);
      pushToast({
        message: `Merged ${colored.length} class${colored.length === 1 ? "" : "es"}${
          fresh.length > 0
            ? ` and ${fresh.length} break${fresh.length === 1 ? "" : "s"}`
            : ""
        } from ${label}`,
        kind: "success",
      });
    },
    [pushHistory, setActiveTabCourses, setActiveTabBreaks, pushToast]
  );

  const importSchedule = useCallback(
    (
      incoming: CourseEntry[],
      newBreaks: ScheduleBreak[],
      label: string,
      slotMinutes?: SlotMinutes
    ) => {
      pushHistory();
      const colored = assignUniqueColors(incoming, []);
      const detected = detectSlotMinutes(colored, slotMinutes ?? slotRef.current);
      const slot: SlotMinutes =
        typeof slotMinutes === "number" && slotMinutes > 0 ? slotMinutes : detected;
      setActiveTabCourses(colored);
      setActiveTabBreaks(newBreaks);
      if (slot !== slotRef.current) {
        setSettings((prev) => ({ ...prev, slotMinutes: slot }));
      }
      pushToast({
        message: `Imported ${colored.length} class${colored.length === 1 ? "" : "es"}${
          newBreaks.length > 0
            ? ` and ${newBreaks.length} break${newBreaks.length === 1 ? "" : "s"}`
            : ""
        } from ${label}`,
        kind: "success",
      });
    },
    [pushHistory, setActiveTabCourses, setActiveTabBreaks, pushToast]
  );

  const applyCourseColor = useCallback(
    (key: string, override: string | null) => {
      pushHistory();
      setActiveTabCourses(
        coursesRef.current.map((c) =>
          courseGroupKey(c) === key
            ? { ...c, colorOverride: override ?? undefined, updatedAt: Date.now() }
            : c
        )
      );
    },
    [pushHistory, setActiveTabCourses]
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
        id: newId(),
        day,
        createdAt: now + i,
        updatedAt: editingKey ? now : undefined,
      }));
      pushHistory();
      setActiveTabCourses([...others, ...created]);
      pushToast({
        message: `Saved "${base.title || base.code}" on ${days.length} day${days.length === 1 ? "" : "s"}`,
        kind: "success",
      });
    },
    [pushHistory, setActiveTabCourses, pushToast]
  );

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (previous === undefined) return;
    futureRef.current.push(snapshot());
    applySnapshot(previous);
    bumpHistory();
  }, [snapshot, applySnapshot, bumpHistory]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next === undefined) return;
    historyRef.current.push(snapshot());
    applySnapshot(next);
    bumpHistory();
  }, [snapshot, applySnapshot, bumpHistory]);

  const canUndo = useMemo(() => historyRef.current.length > 0, [histTick]);
  const canRedo = useMemo(() => futureRef.current.length > 0, [histTick]);

  const updateSettings = useCallback((patch: Partial<ScheduleSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleDay = useCallback((day: WeekDay) => {
    setSettings((prev) => {
      const has = prev.activeDays.includes(day);
      const next = has
        ? prev.activeDays.filter((d) => d !== day)
        : [...prev.activeDays, day].sort(
            (a, b) =>
              "MONTUEWEDTHUFRISATSUN".indexOf(a) - "MONTUEWEDTHUFRISATSUN".indexOf(b)
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
    duplicateCourses,
    mergeBackup,
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
    dismissToast: (id: number) =>
      setToasts((prev) => prev.filter((t) => t.id !== id)),
    notify: pushToast,
  };
}

export type ScheduleApi = ReturnType<typeof useSchedule>;
