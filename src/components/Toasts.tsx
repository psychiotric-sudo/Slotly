import { useEffect, useRef, useState } from "react";
import type { Toast } from "../hooks/useSchedule";

/** Matches the exit animation (var(--dur-short) * 0.75) in index.css. */
const EXIT_MS = 165;

interface ToastsProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function Toasts({ toasts, onDismiss }: ToastsProps) {
  // Removed toasts stay mounted briefly so they can animate out.
  const [leaving, setLeaving] = useState<Toast[]>([]);
  const prev = useRef<Toast[]>(toasts);

  useEffect(() => {
    const current = new Set(toasts.map((t) => t.id));
    const removed = prev.current.filter((t) => !current.has(t.id));
    prev.current = toasts;
    if (removed.length === 0) return;

    setLeaving((list) => [
      ...list.filter((x) => !removed.some((r) => r.id === x.id)),
      ...removed,
    ]);
    const timer = window.setTimeout(() => {
      setLeaving((list) => list.filter((x) => !removed.some((r) => r.id === x.id)));
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0 && leaving.length === 0) return null;

  const items = [
    ...toasts.map((toast) => ({ toast, isLeaving: false })),
    ...leaving.map((toast) => ({ toast, isLeaving: true })),
  ];

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map(({ toast, isLeaving }) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.kind}${isLeaving ? " is-leaving" : ""}`}
          aria-hidden={isLeaving || undefined}
        >
          <span className="toast-message">{toast.message}</span>
          {!isLeaving && toast.actionLabel && toast.onAction && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          {!isLeaving && (
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
