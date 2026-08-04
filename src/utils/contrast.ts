export function getRelativeLuminance(hex: string): number {
  const match = hex.replace("#", "").match(/\w\w/g);
  if (!match) return 0;
  const rgb = match.map((c) => parseInt(c, 16) / 255);
  const [r, g, b] = rgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Chooses a near-black or near-white text color, whichever clears AA better. */
export function getAccessibleTextColor(backgroundHex: string): string {
  const contrastWithBlack = getContrastRatio(backgroundHex, "#000000");
  const contrastWithWhite = getContrastRatio(backgroundHex, "#FFFFFF");
  return contrastWithBlack >= contrastWithWhite ? "#111827" : "#F9FAFB";
}

/** Returns true if the background clears at least 4.5:1 against black or white. */
export function isAccessibleBackground(backgroundHex: string): boolean {
  return (
    getContrastRatio(backgroundHex, "#111827") >= 4.5 ||
    getContrastRatio(backgroundHex, "#F9FAFB") >= 4.5
  );
}

/** Returns true if the background clears at least 3:1 against black or white. */
export function hasReadableText(backgroundHex: string): boolean {
  return (
    getContrastRatio(backgroundHex, "#111827") >= 3 ||
    getContrastRatio(backgroundHex, "#F9FAFB") >= 3
  );
}
