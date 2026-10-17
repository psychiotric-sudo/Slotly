import type { Theme } from "../types";
import { Link } from "react-router-dom";
import Icon from "./icons";

interface TopBarProps {
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onAdd: () => void;
  sidebarOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function TopBar({
  theme,
  onToggleTheme,
  onOpenSettings,
  onToggleSidebar,
  onAdd,
  sidebarOpen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle course panel"
          aria-controls="left-panel"
          aria-expanded={sidebarOpen}
          title="Courses"
        >
          <Icon name="menu" size={18} />
        </button>

        <Link to="/" className="brand" aria-label="Slotly home">
          <svg
            className="brand-logo"
            viewBox="0 0 32 32"
            aria-hidden="true"
            width="24"
            height="24"
          >
            <rect x="2" y="6" width="28" height="24" rx="5" fill="#FDE68A" />
            <rect x="2" y="14" width="28" height="3" fill="#78350F" opacity="0.18" />
            <circle cx="10" cy="21" r="2" fill="#78350F" />
            <circle cx="16" cy="21" r="2" fill="#78350F" />
            <circle cx="22" cy="21" r="2" fill="#78350F" />
            <rect x="7" y="2" width="2.5" height="7" rx="1.25" fill="var(--text-primary)" opacity="0.7" />
            <rect x="22.5" y="2" width="2.5" height="7" rx="1.25" fill="var(--text-primary)" opacity="0.7" />
          </svg>
          <strong className="brand-name">Slotly</strong>
          <span className="brand-tag">timetable builder</span>
        </Link>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn-primary topbar-add"
          onClick={onAdd}
          title="Add a class"
        >
          <Icon name="plus" size={14} />
          Add class
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >
          <Icon name="undo" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Icon name="redo" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label="Toggle dark/light theme"
          title="Toggle theme"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
        >
          <Icon name="sliders" size={18} />
        </button>
      </div>
    </header>
  );
}
