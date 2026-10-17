import type { CourseEntry, ScheduleBreak, SlotMinutes } from "../types";
import { parseBackup } from "./persistence";

/** sessionStorage key carrying a token from /s/:payload into the planner. */
export const SHARE_SESSION_KEY = "slotly_share_import";

export interface ShareData {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  slotMinutes?: SlotMinutes;
  tabName: string;
}

/** The schedule reduced to what a share link carries (active tab only). */
export interface ShareSource {
  courses: CourseEntry[];
  breaks: ScheduleBreak[];
  slotMinutes: SlotMinutes;
  tabName: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): Uint8Array {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const transform = new CompressionStream(
    "deflate-raw"
  ) as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  return readAll(bytesToStream(bytes).pipeThrough(transform));
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const transform = new DecompressionStream(
    "deflate-raw"
  ) as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  return readAll(bytesToStream(bytes).pipeThrough(transform));
}

function hasCompression(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

/**
 * Serializes a schedule into a URL-safe token.
 * Prefers deflate ("d." prefix); falls back to raw UTF-8 ("r." prefix) on
 * browsers without CompressionStream. Any throw resolves to null so callers
 * can report a friendly error instead of crashing.
 */
export async function encodeShareToken(src: ShareSource): Promise<string | null> {
  try {
    const payload = {
      schemaVersion: 4,
      settings: { slotMinutes: src.slotMinutes },
      tabs: [
        {
          id: "shared",
          name: src.tabName || "Shared schedule",
          courses: src.courses,
          breaks: src.breaks,
        },
      ],
      activeId: "shared",
    };
    const json = JSON.stringify(payload);
    if (hasCompression()) {
      const bytes = await deflate(encoder.encode(json));
      return `d.${toBase64Url(bytes)}`;
    }
    return `r.${toBase64Url(encoder.encode(json))}`;
  } catch (err) {
    console.warn("Share encode failed:", err);
    return null;
  }
}

/**
 * Decodes a token from a /s/:payload URL back into schedule data.
 * Returns null for anything malformed or unreadable — never throws.
 */
export async function decodeShareToken(token: string): Promise<ShareData | null> {
  try {
    const dot = token.indexOf(".");
    if (dot < 1) return null;
    const algo = token.slice(0, dot);
    const body = token.slice(dot + 1);
    if (!body) return null;

    let bytes = fromBase64Url(body);
    if (algo === "d") {
      bytes = await inflate(bytes);
    } else if (algo !== "r") {
      return null;
    }
    const restored = parseBackup(decoder.decode(bytes));
    if (!restored || restored.courses.length === 0) return null;
    return {
      courses: restored.courses,
      breaks: restored.breaks,
      slotMinutes: restored.settings.slotMinutes,
      tabName: restored.tabName,
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}

export async function createShareUrl(src: ShareSource): Promise<string | null> {
  const token = await encodeShareToken(src);
  return token ? buildShareUrl(token) : null;
}

/** Clipboard write with a textarea fallback for older/locked-down browsers. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
