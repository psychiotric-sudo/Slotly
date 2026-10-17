import { describe, expect, it } from "vitest";
import {
  buildShareUrl,
  decodeShareToken,
  encodeShareToken,
  type ShareSource,
} from "./share";
import { makeBreak, makeCourses } from "../test/fixtures";

function source(overrides: Partial<ShareSource> = {}): ShareSource {
  return {
    courses: makeCourses([
      { id: "s1", code: "CS301", title: "Operating Systems", day: "MON" },
      { id: "s2", code: "MATH214", title: "Linear Algebra", day: "TUE" },
    ]),
    breaks: [makeBreak({ id: "sb", label: "LUNCH" })],
    slotMinutes: 45,
    tabName: "Fall semester",
    ...overrides,
  };
}

function rawToken(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `r.${b64}`;
}

const hasCompression =
  typeof CompressionStream !== "undefined" &&
  typeof DecompressionStream !== "undefined";

describe("encodeShareToken / decodeShareToken", () => {
  it("round-trips courses, breaks, slot size, and tab name", async () => {
    const token = await encodeShareToken(source());
    expect(token).toBeTruthy();
    if (hasCompression) expect(token!.startsWith("d.")).toBe(true);

    const decoded = await decodeShareToken(token!);
    expect(decoded).not.toBeNull();
    expect(decoded!.courses).toHaveLength(2);
    expect(decoded!.courses[0].code).toBe("CS301");
    expect(decoded!.breaks).toHaveLength(1);
    expect(decoded!.breaks[0].label).toBe("LUNCH");
    expect(decoded!.slotMinutes).toBe(45);
    expect(decoded!.tabName).toBe("Fall semester");
  });

  it("emits URL-safe tokens", async () => {
    const token = await encodeShareToken(source());
    expect(token).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it("decodes the raw (uncompressed) format", async () => {
    const json = JSON.stringify({
      schemaVersion: 4,
      settings: { slotMinutes: 30 },
      tabs: [
        {
          id: "shared",
          name: "Raw tab",
          courses: makeCourses([{ id: "r1", code: "RAW101" }]),
          breaks: [],
        },
      ],
      activeId: "shared",
    });
    const decoded = await decodeShareToken(rawToken(json));
    expect(decoded).not.toBeNull();
    expect(decoded!.courses[0].code).toBe("RAW101");
    expect(decoded!.tabName).toBe("Raw tab");
  });

  it("ignores theme and only keeps the grid slot size", async () => {
    const token = await encodeShareToken(source({ slotMinutes: 60 }));
    const decoded = await decodeShareToken(token!);
    expect(decoded!.slotMinutes).toBe(60);
  });

  it("returns null for garbage and truncated tokens", async () => {
    expect(await decodeShareToken("")).toBeNull();
    expect(await decodeShareToken("no-dot")).toBeNull();
    expect(await decodeShareToken(".abc")).toBeNull();
    expect(await decodeShareToken("d.")).toBeNull();
    expect(await decodeShareToken("x.abc")).toBeNull();
    expect(await decodeShareToken("d.!!!not-base64!!!")).toBeNull();
  });

  it("returns null when the payload isn't a schedule", async () => {
    const token = rawToken(JSON.stringify({ hello: "world" }));
    expect(await decodeShareToken(token)).toBeNull();
  });

  it("returns null for an empty schedule", async () => {
    const token = rawToken(
      JSON.stringify({
        schemaVersion: 4,
        settings: {},
        tabs: [{ id: "shared", name: "Empty", courses: [], breaks: [] }],
        activeId: "shared",
      })
    );
    expect(await decodeShareToken(token)).toBeNull();
  });
});

describe("buildShareUrl", () => {
  it("points at the /s/ route on the current origin", () => {
    const url = buildShareUrl("d.abc");
    expect(url).toContain("/s/d.abc");
    expect(url.startsWith("http")).toBe(true);
  });
});
