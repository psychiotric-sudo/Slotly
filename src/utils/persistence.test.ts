import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  STORAGE_KEY,
  loadState,
  normalizeSettings,
  parseBackup,
  saveState,
} from "./persistence";
import { makeCourses, makeBreak } from "../test/fixtures";

// This environment's `localStorage` (Node webstorage) isn't functional under
// jsdom, so back the tests with a tiny in-memory Storage polyfill.
function installMemoryStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function legacyPayload(): string {
  return JSON.stringify({
    schemaVersion: 1,
    savedAt: 123,
    settings: { startHour: 8, endHour: 16 },
    courses: makeCourses([
      { id: "a", code: "LEG101", title: "Legacy", day: "MON" },
    ]),
    breaks: [makeBreak({ id: "lb", label: "LUNCH" })],
  });
}

function workspacePayload(): string {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    savedAt: 456,
    settings: { ...DEFAULT_SETTINGS, startHour: 9 },
    tabs: [
      {
        id: "tab-1",
        name: "Section A",
        courses: makeCourses([{ id: "w1", code: "WS101", title: "Workspace" }]),
        breaks: [],
      },
    ],
    activeId: "tab-1",
  });
}

beforeEach(() => {
  installMemoryStorage();
});

describe("normalizeSettings", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid overrides and drops invalid ones", () => {
    const out = normalizeSettings({
      startHour: 6,
      fontSize: 99,
      theme: "blue" as never,
      showBreaks: false,
    });
    expect(out.startHour).toBe(6);
    expect(out.showBreaks).toBe(false);
    expect(out.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(out.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it("filters invalid activeDays", () => {
    const out = normalizeSettings({
      activeDays: ["MON", "FOO", "TUE"] as never,
    });
    expect(out.activeDays).toEqual(["MON", "TUE"]);
  });
});

describe("loadState / saveState round-trip", () => {
  it("returns null when nothing is stored", () => {
    expect(loadState()).toBeNull();
  });

  it("persists and reloads a workspace unchanged", () => {
    const state = {
      settings: { ...DEFAULT_SETTINGS, startHour: 7 },
      tabs: [
        {
          id: "t1",
          name: "My Schedule",
          courses: makeCourses([{ id: "c", code: "X", title: "X" }]),
          breaks: [makeBreak()],
        },
      ],
      activeId: "t1",
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.activeId).toBe("t1");
    expect(loaded?.tabs[0].name).toBe("My Schedule");
    expect(loaded?.tabs[0].courses).toHaveLength(1);
    expect(loaded?.tabs[0].breaks).toHaveLength(1);
    expect(loaded?.settings.startHour).toBe(7);
  });

  it("migrates a legacy v1 payload into a single tab", () => {
    localStorage.setItem(STORAGE_KEY, legacyPayload());
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.tabs).toHaveLength(1);
    expect(loaded?.tabs[0].courses[0].code).toBe("LEG101");
    expect(loaded?.tabs[0].breaks[0].label).toBe("LUNCH");
  });

  it("returns null for corrupted JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{ not json");
    expect(loadState()).toBeNull();
  });

  it("returns null for an unrecognized shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: "world" }));
    expect(loadState()).toBeNull();
  });
});

describe("parseBackup", () => {
  it("parses a v4 workspace into its active tab", () => {
    const backup = parseBackup(workspacePayload());
    expect(backup).not.toBeNull();
    expect(backup?.tabName).toBe("Section A");
    expect(backup?.courses[0].code).toBe("WS101");
    expect(backup?.settings.startHour).toBe(9);
  });

  it("parses a legacy payload", () => {
    const backup = parseBackup(legacyPayload());
    expect(backup?.courses[0].code).toBe("LEG101");
    expect(backup?.breaks).toHaveLength(1);
  });

  it("returns null for garbage", () => {
    expect(parseBackup("nope")).toBeNull();
  });
});

describe("saveState", () => {
  it("reports success under normal storage", () => {
    expect(saveState({ settings: DEFAULT_SETTINGS, tabs: [], activeId: null })).toBe(
      true
    );
  });
});
