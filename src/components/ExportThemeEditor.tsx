import type { CSSProperties, ReactNode } from "react";
import type { ExportTheme } from "../types";
import { EXPORT_THEME_PRESETS } from "../utils/exportTheme";

const EXPORT_THEME_FIELDS: { key: keyof ExportTheme; label: string }[] = [
  { key: "timeBg", label: "Time column" },
  { key: "timeText", label: "Time text" },
  { key: "dayBg", label: "Day header" },
  { key: "dayText", label: "Header text" },
  { key: "gridLine", label: "Grid lines" },
];

const PREVIEW_DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const PREVIEW_TIMES = ["7:00", "9:00", "11:00"];

interface ExportThemeEditorProps {
  theme: ExportTheme;
  onChange: (theme: ExportTheme) => void;
}

export default function ExportThemeEditor({ theme, onChange }: ExportThemeEditorProps) {
  return (
    <>
      <ExportThemePreview theme={theme} />
      <div className="theme-presets" role="group" aria-label="Export color themes">
        {EXPORT_THEME_PRESETS.map((preset) => {
          const isActive =
            theme.timeBg === preset.theme.timeBg && theme.dayBg === preset.theme.dayBg;
          return (
            <button
              key={preset.name}
              type="button"
              className={`theme-preset${isActive ? " active" : ""}`}
              onClick={() => onChange({ ...preset.theme })}
              aria-pressed={isActive}
            >
              <span className="theme-preset-swatch">
                <i style={{ background: preset.theme.timeBg }} />
                <i style={{ background: preset.theme.dayBg }} />
              </span>
              {preset.name}
            </button>
          );
        })}
      </div>
      <div className="theme-fields">
        {EXPORT_THEME_FIELDS.map(({ key, label }) => {
          const value = theme[key];
          const set = (hex: string) => onChange({ ...theme, [key]: hex });
          return (
            <label key={key} className="theme-field">
              <span>{label}</span>
              <input
                type="color"
                value={value}
                onChange={(e) => set(e.target.value.toUpperCase())}
                aria-label={`${label} color`}
              />
              <input
                type="text"
                className="input theme-hex"
                value={value}
                onChange={(e) => set(e.target.value)}
                spellCheck={false}
                aria-label={`${label} hex`}
              />
            </label>
          );
        })}
      </div>
    </>
  );
}

function ExportThemePreview({ theme }: { theme: ExportTheme }) {
  const vars = {
    "--etp-time-bg": theme.timeBg,
    "--etp-time-text": theme.timeText,
    "--etp-day-bg": theme.dayBg,
    "--etp-day-text": theme.dayText,
    "--etp-line": theme.gridLine,
  } as CSSProperties;
  const blockAt = (r: number, d: number): ReactNode => {
    const tint = [null, "#3B82F6", null, "#10B981"][r];
    if (!tint || d !== r) return null;
    return (
      <span className="etp-block" style={{ backgroundColor: tint, color: "#ffffff" }}>
        CS 202
      </span>
    );
  };
  const cells = [];
  for (let r = 0; r < PREVIEW_TIMES.length; r++) {
    cells.push(
      <div key={`t-${r}`} className="etp-time" style={{ gridRow: r + 2, gridColumn: 1 }}>
        {PREVIEW_TIMES[r]}
      </div>
    );
    for (let d = 0; d < PREVIEW_DAYS.length; d++) {
      const col = d + 2;
      cells.push(
        <div key={`c-${r}-${d}`} className="etp-cell" style={{ gridRow: r + 2, gridColumn: col }}>
          {blockAt(r, d)}
        </div>
      );
    }
  }
  return (
    <div
      className="etp-grid"
      role="img"
      aria-label="Preview of the exported timetable using these colors"
      style={vars}
    >
      <div className="etp-corner">TIME</div>
      {PREVIEW_DAYS.map((d, i) => (
        <div key={d} className="etp-day" style={{ gridRow: 1, gridColumn: i + 2 }}>
          {d}
        </div>
      ))}
      {cells}
    </div>
  );
}