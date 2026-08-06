// Headless smoke test for the JPG/PDF export pipeline.
//
// Drives the REAL export.ts bundle (built from source via esbuild) inside
// jsdom, with a fake canvas that records width/height and serves a valid
// 1x1 JPEG. This validates:
//   - the pipeline completes without throwing,
//   - progress is monotonic and reaches 100%,
//   - the render-resolution cap keeps huge (non-simplified) grids bounded,
//   - a PDF can actually be assembled from the produced canvas image.
//
// Run: npm run test:export
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// Keep the bundle inside the project so Node can resolve the external jspdf
// from ./node_modules during the PDF export.
const OUT_FILE = join(ROOT, "scripts", ".export.bundle.mjs");

try {
  mkdirSync(join(ROOT, "scripts"), { recursive: true });
  await build({
    entryPoints: [join(ROOT, "src/lib/export.ts")],
    bundle: true,
    format: "esm",
    platform: "browser",
    external: ["jspdf"],
    outfile: OUT_FILE,
    logLevel: "silent",
    sourcemap: false,
  });

  // ---- jsdom environment ----
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://localhost:5173/",
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  // 1x1 white JPEG (valid, so jsPDF can decode it).
  const TINY_JPEG =
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==";

const canvases = [];
  function makeCtx() {
    const ctx = {
      fillStyle: "", strokeStyle: "", lineWidth: 1,
      textAlign: "left", textBaseline: "alphabetic", font: "12px Inter", letterSpacing: "0px",
      scale: () => {}, translate: () => {}, save: () => {}, restore: () => {},
      fillRect: () => {}, strokeRect: () => {}, fillText: () => {},
      measureText: (t) => {
        // Width must scale with the font px size so fitBlockContent's font-shrink
        // loop converges (a constant width would loop forever at min size).
        const m = ctx.font.match(/(\d+(?:\.\d+)?)px/);
        const size = m ? parseFloat(m[1]) : 12;
        return { width: (t && t.length ? t.length : 0) * size * 0.55 };
      },
    };
    return ctx;
  }
  const originalCreateElement = dom.window.document.createElement.bind(dom.window.document);
  dom.window.document.createElement = (tag, opts) => {
    const lower = String(tag).toLowerCase();
    if (lower === "canvas") {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => makeCtx(),
        toBlob: (cb) => cb(new Blob([Buffer.from(TINY_JPEG, "base64")], { type: "image/jpeg" })),
        toDataURL: () => `data:image/jpeg;base64,${TINY_JPEG}`,
      };
      canvases.push(canvas);
      return canvas;
    }
    if (lower === "a") {
      return { href: "", download: "", style: {}, setAttribute() {}, appendChild() {}, remove() {}, click() {} };
    }
    return originalCreateElement(tag, opts);
  };
  dom.window.document.body.appendChild = () => {};
  dom.window.document.fonts = { ready: Promise.resolve() };

  const { exportToJPG, exportToPDF } = await import(
    `${pathToFileURL(OUT_FILE).href}?t=${Date.now()}`
  );

  // ---- fixtures ----
  const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const times = ["09:00-10:30", "10:45-12:15", "12:30-14:00", "14:15-15:45", "16:00-17:30", "18:00-19:30", "19:45-21:15"];
  const courses = times.flatMap((t, i) => {
    const [start, end] = t.split("-");
    return DAYS.slice(0, 5).map((day, d) => ({
      id: `c${i}-${d}`,
      title: `Course ${i}`,
      code: `CS${100 + i}`,
      instructor: "Prof. Smith",
      room: `R${200 + i}`,
      day,
      startTime: start,
      endTime: end,
      colorHex: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"][i % 5],
      createdAt: Date.now(),
    }));
  });
  const breaks = [{ id: "b1", label: "LUNCH BREAK", startTime: "13:00", endTime: "14:00" }];

  function baseData(simplifyExport) {
    return {
      courses,
      breaks,
      activeDays: DAYS,
      startHour: 6,
      endHour: 23,
      slotMinutes: 15,
      showBreaks: true,
      simplifyExport,
    };
  }

  function trackProgress() {
    const values = [];
    return { values, onProgress: (p) => values.push(p) };
  }

  function assertProgress(values, label) {
    assert.ok(values.length >= 3, `${label}: progress reported multiple times`);
    for (let i = 1; i < values.length; i++) {
      assert.ok(values[i] >= values[i - 1], `${label}: monotonic at ${i} (${values[i - 1]} -> ${values[i]})`);
    }
    assert.equal(values[values.length - 1], 100, `${label}: reaches 100%`);
  }

  const MAX_PIXELS = 6_500_000;

  // ---- 1) JPG export, full (non-simplified) grid - the case that froze the tab ----
  {
    const { values, onProgress } = trackProgress();
    const t0 = Date.now();
    await exportToJPG(baseData(false), "schedule.jpg", onProgress);
    const elapsed = Date.now() - t0;
    assertProgress(values, "JPG full-grid");

    const last = canvases[canvases.length - 1];
    const area = last.width * last.height;
    assert.ok(area > 0, "JPG canvas has pixels");
    assert.ok(area <= MAX_PIXELS * 1.05, `JPG canvas bounded (${area}px² <= ~${MAX_PIXELS}px²)`);
    assert.ok(elapsed < 5000, `JPG export completes quickly (${elapsed}ms)`);
    console.log(`JPG full-grid OK: ${last.width}x${last.height}px (${area}px²) in ${elapsed}ms, progress -> 100%`);
  }

  // ---- 2) PDF export, full grid ----
  {
    // jsPDF.prototype.save triggers a DOM download; no-op it for the test.
    const { jsPDF } = await import("jspdf");
    jsPDF.prototype.save = function () {
      return this;
    };
    const { values, onProgress } = trackProgress();
    const t0 = Date.now();
    await exportToPDF(baseData(false), "schedule.pdf", onProgress);
    const elapsed = Date.now() - t0;
    assertProgress(values, "PDF full-grid");
    assert.ok(elapsed < 5000, `PDF export completes quickly (${elapsed}ms)`);
    console.log(`PDF full-grid OK in ${elapsed}ms, progress -> 100%`);
  }

  // ---- 3) PDF actually produces bytes from the same canvas image ----
  {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.addImage(`data:image/jpeg;base64,${TINY_JPEG}`, "JPEG", 10, 10, 277, 190);
    const bytes = pdf.output("arraybuffer");
    assert.ok(bytes.byteLength > 500, "PDF assembles non-empty bytes");
    assert.match(new TextDecoder().decode(bytes.slice(0, 8)), /%PDF/, "PDF header present");
    console.log(`PDF assembly OK: ${bytes.byteLength} bytes`);
  }

  // ---- 4) small schedule keeps normal resolution (cap does not over-shrink) ----
  {
    const small = {
      courses: courses.slice(0, 4),
      breaks,
      activeDays: ["MON", "TUE", "WED", "THU", "FRI"],
      startHour: 8,
      endHour: 18,
      slotMinutes: 30,
      showBreaks: true,
      simplifyExport: false,
    };
    const { values, onProgress } = trackProgress();
    await exportToJPG(small, "small.jpg", onProgress);
    assertProgress(values, "JPG small");
    const last = canvases[canvases.length - 1];
    assert.ok(last.width >= 1000, `small schedule keeps resolution (${last.width}x${last.height})`);
    console.log(`JPG small OK: ${last.width}x${last.height}px`);
  }

  // ---- 5) real-world CE schedule (user-provided), SIMPLIFIED export ----
  {
    const CE_ROWS = [
      { title: "Technopreneurship 101", code: "Techno 101", instructor: "Engr. MR. Dela Peña", room: "", day: "MON", startTime: "09:00", endTime: "10:30" },
      { title: "Technopreneurship 101", code: "Techno 101", instructor: "Engr. MR. Dela Peña", room: "", day: "WED", startTime: "09:00", endTime: "10:30" },
      { title: "Structural Theory", code: "CE 311", instructor: "Engr. MA. Diaz", room: "", day: "MON", startTime: "13:30", endTime: "16:30" },
      { title: "Structural Theory", code: "CE 311", instructor: "Engr. MA. Diaz", room: "", day: "WED", startTime: "13:30", endTime: "16:30" },
      { title: "Environmental Science", code: "GEE 108", instructor: "Engr. AE. Distura", room: "", day: "MON", startTime: "16:30", endTime: "18:00" },
      { title: "Environmental Science", code: "GEE 108", instructor: "Engr. AE. Distura", room: "", day: "WED", startTime: "16:30", endTime: "18:00" },
      { title: "Highway and Railroad Engineering", code: "CE 312", instructor: "Engr. MR. Dela Peña", room: "", day: "TUE", startTime: "08:00", endTime: "09:30" },
      { title: "Highway and Railroad Engineering", code: "CE 312", instructor: "Engr. MR. Dela Peña", room: "", day: "THU", startTime: "08:00", endTime: "09:30" },
      { title: "Engineering Utilities 1", code: "CE 313", instructor: "Engr. DD. Fabiaña", room: "", day: "TUE", startTime: "09:30", endTime: "11:00" },
      { title: "Engineering Utilities 1", code: "CE 313", instructor: "Engr. DD. Fabiaña", room: "", day: "THU", startTime: "09:30", endTime: "11:00" },
      { title: "Engineering Utilities 2", code: "CE 314", instructor: "Engr. MB. Reyes", room: "", day: "TUE", startTime: "13:00", endTime: "14:30" },
      { title: "Engineering Utilities 2", code: "CE 314", instructor: "Engr. MB. Reyes", room: "", day: "THU", startTime: "13:00", endTime: "14:30" },
      { title: "Numerical Solutions to CE Problems", code: "CE 315", instructor: "Engr. NV. Extrabo", room: "", day: "TUE", startTime: "14:30", endTime: "17:00" },
      { title: "Numerical Solutions to CE Problems", code: "CE 315", instructor: "Engr. NV. Extrabo", room: "", day: "THU", startTime: "14:30", endTime: "17:00" },
    ];
    const CE_PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316"];
    const ceCourses = CE_ROWS.map((c, i) => ({
      ...c,
      id: `ce-${i}`,
      colorHex: CE_PALETTE[i % CE_PALETTE.length],
      createdAt: Date.now(),
    }));
    const ceData = {
      courses: ceCourses,
      breaks: [],
      activeDays: ["MON", "TUE", "WED", "THU", "FRI"],
      startHour: 7,
      endHour: 18,
      slotMinutes: 30,
      showBreaks: true,
      simplifyExport: true,
    };

    const jpgTrack = trackProgress();
    const t0 = Date.now();
    await exportToJPG(ceData, "ce-schedule.jpg", jpgTrack.onProgress);
    const jpgMs = Date.now() - t0;
    assertProgress(jpgTrack.values, "CE simplified JPG");
    const jpgCanvas = canvases[canvases.length - 1];
    const jpgArea = jpgCanvas.width * jpgCanvas.height;
    assert.ok(jpgArea <= MAX_PIXELS * 1.05, `CE JPG bounded (${jpgArea}px²)`);
    assert.ok(jpgMs < 5000, `CE JPG completes quickly (${jpgMs}ms)`);
    console.log(`CE simplified JPG OK: ${jpgCanvas.width}x${jpgCanvas.height}px (${jpgArea}px²) in ${jpgMs}ms, progress -> 100%`);

    const { jsPDF } = await import("jspdf");
    jsPDF.prototype.save = function () {
      return this;
    };
    const pdfTrack = trackProgress();
    const t1 = Date.now();
    await exportToPDF(ceData, "ce-schedule.pdf", pdfTrack.onProgress);
    const pdfMs = Date.now() - t1;
    assertProgress(pdfTrack.values, "CE simplified PDF");
    assert.ok(pdfMs < 5000, `CE PDF completes quickly (${pdfMs}ms)`);
    console.log(`CE simplified PDF OK in ${pdfMs}ms, progress -> 100%`);
  }

  console.log("\nAll export smoke checks passed.");
} finally {
  rmSync(OUT_FILE, { force: true });
}
