import Modal from "./Modal";
import Icon from "./icons";
import type { ScheduleSettings } from "../types";

interface SettingsDrawerProps {
  settings: ScheduleSettings;
  onUpdate: (patch: Partial<ScheduleSettings>) => void;
  onClose: () => void;
  onResetDemo: () => void;
}

export default function SettingsDrawer({
  settings,
  onUpdate,
  onClose,
  onResetDemo,
}: SettingsDrawerProps) {
  return (
    <Modal role="dialog" labelledBy="settings-title" onClose={onClose} className="settings-modal">
      <header className="modal-header">
        <h2 id="settings-title">Settings</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>
      </header>

      <div className="modal-body">
        <div className="settings-group">
          <h3>Time range</h3>
          <div className="field-row">
            <div className="field">
              <label htmlFor="st-start">Start hour</label>
              <input
                id="st-start"
                className="input"
                type="number"
                min={0}
                max={23}
                value={settings.startHour}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0 && v <= 23) {
                    onUpdate({ startHour: v });
                  }
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="st-end">End hour</label>
              <input
                id="st-end"
                className="input"
                type="number"
                min={1}
                max={24}
                value={settings.endHour}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 1 && v <= 24) {
                    onUpdate({ endHour: v });
                  }
                }}
              />
            </div>
          </div>
          {settings.startHour >= settings.endHour && (
            <p className="form-error">End hour must be after start hour.</p>
          )}
        </div>

        <div className="settings-group">
          <h3>Grid granularity</h3>
          <div className="segmented">
            <button
              type="button"
              className={settings.slotMinutes === 30 ? "active" : ""}
              onClick={() => onUpdate({ slotMinutes: 30 })}
            >
              30 min
            </button>
            <button
              type="button"
              className={settings.slotMinutes === 15 ? "active" : ""}
              onClick={() => onUpdate({ slotMinutes: 15 })}
            >
              15 min
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h3>Theme</h3>
          <div className="segmented">
            <button
              type="button"
              className={settings.theme === "light" ? "active" : ""}
              onClick={() => onUpdate({ theme: "light" })}
            >
              Light
            </button>
            <button
              type="button"
              className={settings.theme === "dark" ? "active" : ""}
              onClick={() => onUpdate({ theme: "dark" })}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h3>Font size</h3>
          <div className="segmented">
            {[10, 11, 12, 13, 14].map((size) => (
              <button
                key={size}
                type="button"
                className={settings.fontSize === size ? "active" : ""}
                onClick={() => onUpdate({ fontSize: size })}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <h3>Week layout</h3>
          <label className="toggle-row">
            <span>Sunday first</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.sundayFirst}
              onChange={(e) => onUpdate({ sundayFirst: e.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>Conflict badges</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.showConflictBadges}
              onChange={(e) => onUpdate({ showConflictBadges: e.target.checked })}
            />
          </label>
        </div>

        <div className="settings-group">
          <h3>Data</h3>
          <button
            type="button"
            className="btn-danger-ghost"
            onClick={() => {
              if (window.confirm("Clear everything and load the demo schedule?")) {
                onResetDemo();
              }
            }}
          >
            Reset to demo data
          </button>
        </div>
      </div>

      <footer className="modal-footer">
        <div className="footer-spacer" />
        <button type="button" className="btn-primary" data-default-focus onClick={onClose}>
          Done
        </button>
      </footer>
    </Modal>
  );
}
