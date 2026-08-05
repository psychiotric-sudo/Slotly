import type { CourseEntry } from "../types";

export interface PaletteColor {
  hex: string;
  name: string;
  text: string;
}

export const PALETTE: PaletteColor[] = [
  { hex: "#FDE68A", name: "Yellow", text: "#78350F" },
  { hex: "#FCA5A5", name: "Red", text: "#7F1D1D" },
  { hex: "#86EFAC", name: "Green", text: "#14532D" },
  { hex: "#93C5FD", name: "Blue", text: "#1E3A8A" },
  { hex: "#D8B4FE", name: "Purple", text: "#4C1D95" },
  { hex: "#FDBA74", name: "Orange", text: "#7C2D12" },
  { hex: "#E5E7EB", name: "Neutral Gray", text: "#111827" },
];

/** Stable identity of a course: prefer code, fall back to title. */
export function courseGroupKey(course: { code: string; title: string }): string {
  const raw = course.code?.trim() || course.title?.trim();
  return (raw || "untitled").toLowerCase();
}

/** Deterministic auto-color: every block of the same course gets the same palette color. */
export function getAutoColor(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = (h * 33) ^ key.charCodeAt(i);
  }
  h = h >>> 0;
  return PALETTE[h % PALETTE.length].hex;
}

/** The color actually rendered for a block: manual override wins, else auto. */
export function effectiveColor(course: CourseEntry): string {
  return course.colorOverride ?? getAutoColor(courseGroupKey(course));
}

/**
 * Assigns each distinct subject/course a unique palette color so no two
 * different courses collide. Existing overrides are kept; already-used colors
 * are skipped when handing out new ones.
 */
export function assignUniqueColors(
  incoming: CourseEntry[],
  existing: CourseEntry[] = []
): CourseEntry[] {
  const used = new Set(existing.flatMap((c) => (c.colorOverride ? [c.colorOverride] : [])));
  const resolved = new Map<string, string>();

  const groupFor = (c: CourseEntry) => courseGroupKey(c);
  const colorFor = (c: CourseEntry): string => {
    if (c.colorOverride) return c.colorOverride;
    const group = groupFor(c);
    if (resolved.has(group)) return resolved.get(group)!;
    let candidate = getAutoColor(group);
    if (!used.has(candidate)) used.add(candidate);
    else {
      for (let i = 0; i < PALETTE.length; i++) {
        const alt = PALETTE[i].hex;
        if (!used.has(alt)) {
          candidate = alt;
          used.add(alt);
          break;
        }
      }
    }
    resolved.set(group, candidate);
    return candidate;
  };

  return incoming.map((c) => {
    const color = colorFor(c);
    return c.colorOverride ? c : { ...c, colorOverride: color };
  });
}

export function isPastel(hex: string): boolean {
  return PALETTE.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}

/** Darkens a hex color by a factor (0 = unchanged, 1 = black). */
export function darkenHex(hex: string, factor: number): string {
  const match = hex.replace("#", "").match(/\w\w/g);
  if (!match) return hex;
  const channels = match.map((c) => {
    const v = Math.round(parseInt(c, 16) * (1 - factor));
    return Math.max(0, Math.min(255, v))
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}
