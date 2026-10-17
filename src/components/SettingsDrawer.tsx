import { useState } from "react";
import Modal from "./Modal";
import Icon from "./icons";
import type { ScheduleBreak, ScheduleSettings } from "../types";
import { validTime, timeToMinutes } from "../utils/time";
import { newId } from "../utils/id";

interface SettingsDrawerProps {
  settings: ScheduleSettings;
  breaks: ScheduleBreak[];
  onUpdate: (patch: Partial<ScheduleSettings>) => void;
  onAddBreak: (br: ScheduleBreak) => void;
  onUpdateBreak: (id: string, patch: Partial<ScheduleBreak>) => void;
  onDeleteBreak: (id: string) => void;
  onClose: () => void;
  onResetDemo: () => void;
}

export default function SettingsDrawer({
  settings,
  breaks,
  onUpdate,
  onAddBreak,
  onUpdateBreak,
  onDeleteBreak,
  onClose,
  onResetDemo,
}: SettingsDrawerProps) {
  const [draft, setDraft] = useState({ label: "", startTime: "", endTime: "" });
  const [confirmingReset, setConfirmingReset] = useState(false);

  const addDraft = () => {
    const label = draft.label.trim();
    const start = draft.startTime.trim();
    const end = draft.endTime.trim();
    if (!label || !validTime(start) || !validTime(end)) return;
    if (timeToMinutes(end) <= timeToMinutes(start)) return;
    onAddBreak({ id: newId(), label, startTime: start, endTime: end });
    setDraft({ label: "", startTime: "", endTime: "" });
  };

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
        </div>

        <div className="settings-group">
          <h3>Teacher mode</h3>
          <label className="toggle-row">
            <span>I'm a teacher</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.teacherMode}
              onChange={(e) => onUpdate({ teacherMode: e.target.checked })}
            />
          </label>
          {settings.teacherMode && (
            <p className="settings-hint">
              A tab bar appears above the timetable — add a tab for each section you
              teach and switch between them. The active tab's name is printed as the
              title on your exported schedule.
            </p>
          )}
        </div>

        <div className="settings-group">
          <h3>Display</h3>
          <div className="field">
            <span className="field-label">Theme</span>
            <div className="segmented" role="group" aria-label="Theme">
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
          <div className="field">
            <span className="field-label">Font size</span>
            <div className="segmented" role="group" aria-label="Font size">
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
          <label className="toggle-row">
            <span>Conflict badges</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.showConflictBadges}
              onChange={(e) => onUpdate({ showConflictBadges: e.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>Simplify on screen</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.simplifyView}
              onChange={(e) => onUpdate({ simplifyView: e.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>Fit all days to screen (mobile)</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.fitAllDays}
              onChange={(e) => onUpdate({ fitAllDays: e.target.checked })}
            />
          </label>
        </div>

        <div className="settings-group">
          <h3>Breaks (recess / lunch)</h3>
          <label className="toggle-row">
            <span>Show merged rows on the grid</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.showBreaks}
              onChange={(e) => onUpdate({ showBreaks: e.target.checked })}
            />
          </label>
          {breaks.length === 0 && (
            <p className="settings-hint">
              No breaks yet. Add one below (e.g. RECESS or LUNCH BREAK).
            </p>
          )}
          <ul className="break-list">
            {breaks.map((br) => (
              <li key={br.id} className="break-item">
                <input
                  className="input break-field"
                  value={br.label}
                  onChange={(e) => onUpdateBreak(br.id, { label: e.target.value })}
                  aria-label="Break label"
                />
                <input
                  className="input break-field break-field--time"
                  value={br.startTime}
                  onChange={(e) => onUpdateBreak(br.id, { startTime: e.target.value })}
                  aria-label="Break start time"
                />
                <span className="break-dash">–</span>
                <input
                  className="input break-field break-field--time"
                  value={br.endTime}
                  onChange={(e) => onUpdateBreak(br.id, { endTime: e.target.value })}
                  aria-label="Break end time"
                />
                <button
                  type="button"
                  className="icon-btn break-delete"
                  onClick={() => onDeleteBreak(br.id)}
                  aria-label={`Delete ${br.label || "break"}`}
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
          <div className="break-add">
            <input
              className="input break-field"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Label"
              aria-label="New break label"
            />
            <input
              className="input break-field break-field--time"
              value={draft.startTime}
              onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              placeholder="HH:MM"
              aria-label="New break start time"
            />
            <input
              className="input break-field break-field--time"
              value={draft.endTime}
              onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              placeholder="HH:MM"
              aria-label="New break end time"
            />
            <button type="button" className="btn-secondary" onClick={addDraft}>
              <Icon name="plus" size={14} /> Add
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h3>Export</h3>
          <label className="toggle-row">
            <span>Simplify when exporting</span>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.simplifyExport}
              onChange={(e) => onUpdate({ simplifyExport: e.target.checked })}
            />
          </label>
        </div>

        <div className="settings-group">
          <h3>Data</h3>
          {confirmingReset ? (
            <div className="confirm-row" role="group" aria-label="Confirm reset">
              <span className="confirm-row__label">
                Clear everything and load the demo schedule?
              </span>
              <div className="confirm-row__actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirmingReset(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger-solid"
                  data-default-focus
                  onClick={() => {
                    setConfirmingReset(false);
                    onResetDemo();
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-danger-ghost"
              onClick={() => setConfirmingReset(true)}
            >
              Reset to demo data
            </button>
          )}
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
