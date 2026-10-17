const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RFC4122-ish unique id. Uses crypto.randomUUID when available (secure
 * contexts / modern browsers) and falls back to getRandomValues, then to
 * Math.random so the app never crashes on HTTP (LAN) or old Safari.
 */
export function newId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      const id = crypto.randomUUID();
      if (UUID_RE.test(id)) return id;
    }
  } catch {
    /* fall through */
  }
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    ) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
      return (
        hex.slice(0, 4).join("") +
        "-" +
        hex.slice(4, 6).join("") +
        "-" +
        hex.slice(6, 8).join("") +
        "-" +
        hex.slice(8, 10).join("") +
        "-" +
        hex.slice(10, 16).join("")
      );
    }
  } catch {
    /* fall through */
  }
  let seed = Math.floor(Math.random() * 0xffffffff);
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    parts.push(seed.toString(16).padStart(8, "0"));
  }
  const a = parts[0];
  const b = parts[1];
  const c = parts[2];
  const d = parts[3];
  return `${a}-${b.slice(0, 4)}-${b.slice(4, 8)}-${c.slice(0, 4)}-${c.slice(4, 8)}${d.slice(0, 4)}`;
}
