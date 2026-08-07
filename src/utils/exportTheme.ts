import type { ExportTheme } from "../types";

/** Matches the printable timetable's classic amber/green palette. */
export const DEFAULT_EXPORT_THEME: ExportTheme = {
  timeBg: "#FDE047",
  timeText: "#713F12",
  dayBg: "#81C784",
  dayText: "#0B3D0F",
  gridLine: "#d9d9d9",
};

export interface ExportThemePreset {
  name: string;
  theme: ExportTheme;
}

export const EXPORT_THEME_PRESETS: ExportThemePreset[] = [
  { name: "Classic", theme: DEFAULT_EXPORT_THEME },
  {
    name: "Ocean",
    theme: {
      timeBg: "#BFDBFE",
      timeText: "#1E3A8A",
      dayBg: "#A7F3D0",
      dayText: "#064E3B",
      gridLine: "#CBD5E1",
    },
  },
  {
    name: "Sunset",
    theme: {
      timeBg: "#FED7AA",
      timeText: "#7C2D12",
      dayBg: "#FBCFE8",
      dayText: "#831843",
      gridLine: "#EAD9C3",
    },
  },
  {
    name: "Slate",
    theme: {
      timeBg: "#E2E8F0",
      timeText: "#334155",
      dayBg: "#CBD5E1",
      dayText: "#1E293B",
      gridLine: "#CBD5E1",
    },
  },
  {
    name: "Paper",
    theme: {
      timeBg: "#F5F5F4",
      timeText: "#44403C",
      dayBg: "#E7E5E4",
      dayText: "#292524",
      gridLine: "#D6D3D1",
    },
  },
  {
    name: "Barbie",
    theme: {
      timeBg: "#FBCFE8",
      timeText: "#9D174D",
      dayBg: "#F472B6",
      dayText: "#500724",
      gridLine: "#F9A8D4",
    },
  },
  {
    name: "Coquette",
    theme: {
      timeBg: "#FDECE4",
      timeText: "#8C3A66",
      dayBg: "#F7CEDC",
      dayText: "#6B2444",
      gridLine: "#F0D3DD",
    },
  },
  {
    name: "Professional",
    theme: {
      timeBg: "#E5E7EB",
      timeText: "#1E293B",
      dayBg: "#1D4ED8",
      dayText: "#FFFFFF",
      gridLine: "#93C5FD",
    },
  },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Merges an untrusted/partial value into a complete, valid theme. */
export function normalizeExportTheme(value: unknown): ExportTheme {
  const src = (typeof value === "object" && value !== null ? value : {}) as Partial<ExportTheme>;
  const pick = <K extends keyof ExportTheme>(key: K): string =>
    typeof src[key] === "string" && HEX.test(src[key] as string)
      ? (src[key] as string)
      : DEFAULT_EXPORT_THEME[key];
  return {
    timeBg: pick("timeBg"),
    timeText: pick("timeText"),
    dayBg: pick("dayBg"),
    dayText: pick("dayText"),
    gridLine: pick("gridLine"),
  };
}