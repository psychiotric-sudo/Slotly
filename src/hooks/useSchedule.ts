import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CourseEntry, ScheduleSettings, WeekDay } from "../types";
import {
  DEFAULT_SETTINGS,
  loadState,
  normalizeSettings,
  saveState,
  STORAGE_KEY,
} from "../utils/persistence";
import { buildDemoCourses } from "../data/demo";
import { assignUniqueColors, courseGroupKey } from "../utils/colors";

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
  const [courses, setCourses] = useState<CourseEntry[]>(() => {
    const loaded = loadState();
    return loaded ? loaded.courses : [];
  });

  const [settings, setSettings] = useState<ScheduleSettings>(() => {
    const loaded = loadState();
    return loaded ? normalizeSettings(loaded.settings) : { ...DEFAULT_SETTINGS };
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const historyRef = useRef<CourseEntry[][]>([]);
  const futureRef = useRef<CourseEntry[][]>([]);
  const skipHistoryRef = useRef(false);
  const toastId = useRef(0);

  const coursesRef = useRef(courses);
  coursesRef.current = courses;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveState({ courses, settings });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [courses, settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  /** Keeps open tabs in sync when another tab writes to localStorage. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const loaded = loadState();
      if (!loaded) return;
      historyRef.current = [];
      futureRef.current = [];
      setCourses(loaded.courses);
      setSettings(normalizeSettings(loaded.settings));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: CourseEntry[]) => {
    if (!skipHistoryRef.current) {
      historyRef.current.push(coursesRef.current);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
      futureRef.current = [];
    }
    skipHistoryRef.current = false;
    setCourses(next);
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const addCourse = useCallback(
    (course: CourseEntry) => {
      commit([...coursesRef.current, course]);
      pushToast({ message: `Added "${course.title}"`, kind: "success" });
    },
    [commit, pushToast]
  );

  const updateCourse = useCallback(
    (updated: CourseEntry) => {
      commit(coursesRef.current.map((c) => (c.id === updated.id ? updated : c)));
      pushToast({ message: `Updated "${updated.title}"`, kind: "success" });
    },
    [commit, pushToast]
  );

  const deleteCourse = useCallback(
    (id: string) => {
      const target = coursesRef.current.find((c) => c.id === id);
      commit(coursesRef.current.filter((c) => c.id !== id));
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
    [commit, pushToast, addCourse]
  );

  /** Deletes every block of a study load across all of its days. */
  const deleteCourseGroup = useCallback(
    (key: string) => {
      const matching = coursesRef.current.filter((c) => courseGroupKey(c) === key);
      if (matching.length === 0) return;
      const target = matching[0];
      commit(coursesRef.current.filter((c) => courseGroupKey(c) !== key));
      pushToast({
        message: `Deleted "${target.title || target.code}"`,
        kind: "danger",
        actionLabel: "Undo",
        onAction: () => {
          skipHistoryRef.current = true;
          commit([...coursesRef.current, ...matching]);
        },
      });
    },
    [commit, pushToast]
  );

  const clearAll = useCallback(() => {
    const count = coursesRef.current.length;
    if (count === 0) return;
    commit([]);
    pushToast({
      message: `Cleared ${count} class${count === 1 ? "" : "es"}`,
      kind: "danger",
      actionLabel: "Undo",
      onAction: () => {
        skipHistoryRef.current = true;
        commit(historyRef.current[historyRef.current.length - 1] ?? []);
      },
    });
  }, [commit, pushToast]);

  const loadDemo = useCallback(() => {
    skipHistoryRef.current = true;
    historyRef.current.push(coursesRef.current);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    futureRef.current = [];
    setCourses(buildDemoCourses());
    pushToast({ message: "Loaded demo schedule", kind: "success" });
  }, [pushToast]);

  const importCourses = useCallback(
    (imported: CourseEntry[], label: string) => {
      skipHistoryRef.current = true;
      historyRef.current.push(coursesRef.current);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
      futureRef.current = [];
      setCourses(imported);
      pushToast({ message: `Imported ${label}`, kind: "success" });
    },
    [pushToast]
  );

  const mergeCourses = useCallback(
    (incoming: CourseEntry[], label: string) => {
      skipHistoryRef.current = true;
      historyRef.current.push(coursesRef.current);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
      futureRef.current = [];
      const colored = assignUniqueColors(incoming, coursesRef.current);
      setCourses([...coursesRef.current, ...colored]);
      pushToast({
        message: `Added ${incoming.length} class${incoming.length === 1 ? "" : "es"} from ${label}`,
        kind: "success",
      });
    },
    [pushToast]
  );

  /** Applies a manual color (or clears it) across every block that shares a course identity. */
  const applyCourseColor = useCallback(
    (key: string, override: string | null) => {
      skipHistoryRef.current = true;
      commit(
        coursesRef.current.map((c) =>
          (c.code || c.title).trim().toLowerCase() === key
            ? { ...c, colorOverride: override ?? undefined, updatedAt: Date.now() }
            : c
        )
      );
    },
    [commit]
  );

  /**
   * Saves one study load across one or more days (e.g. Tue & Thu).
   * When `editingKey` is provided, every existing block sharing that identity
   * is replaced by the new day set — so changing the checkboxes updates the
   * whole course, not just a single day.
   */
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

      commit([...others, ...created]);
      pushToast({
        message: `Saved "${base.title || base.code}" on ${days.length} day${days.length === 1 ? "" : "s"}`,
        kind: "success",
      });
    },
    [commit, pushToast]
  );

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (previous === undefined) return;
    futureRef.current.push(coursesRef.current);
    setCourses(previous);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next === undefined) return;
    historyRef.current.push(coursesRef.current);
    setCourses(next);
  }, []);

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
            (a, b) =>
              "MONTUEWEDTHUFRISATSUN".indexOf(a) -
              "MONTUEWEDTHUFRISATSUN".indexOf(b)
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
    courses,
    settings,
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
