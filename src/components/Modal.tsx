import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

/** Matches the exit animation (var(--dur-long) * 0.75) in index.css. */
const EXIT_MS = 315;

const ModalCloseContext = createContext<() => void>(() => {});

/**
 * A button that asks the enclosing <Modal> to play its exit animation and close.
 * Must be rendered *inside* <Modal> — the close handler travels via context, so a
 * parent component that renders <Modal> cannot call it directly.
 */
export function ModalCloseButton({
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const close = useContext(ModalCloseContext);
  return <button type={type} {...rest} onClick={close} />;
}

interface ModalProps {
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function Modal({
  role = "dialog",
  labelledBy,
  onClose,
  children,
  className = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);

  // Play an exit animation, then hand control back to the owner.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => onClose(), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const dialog = dialogRef.current;
    if (dialog) {
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const cancel = dialog.querySelector<HTMLElement>('[data-default-focus]');
      if (cancel) {
        cancel.focus();
      } else if (focusables.length > 0) {
        focusables[0].focus();
      }
    }

    return () => {
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [requestClose]);

  return (
    <div
      className={`modal-backdrop${closing ? " is-closing" : ""}`}
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal ${className}${closing ? " is-closing" : ""}`}
        role="presentation"
      >
        <ModalCloseContext.Provider value={requestClose}>
          {children}
        </ModalCloseContext.Provider>
      </div>
    </div>
  );
}
