import { describe, expect, it } from "vitest";
import { newId } from "./id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("newId", () => {
  it("produces a UUID-shaped id", () => {
    expect(newId()).toMatch(UUID_RE);
  });

  it("produces distinct ids", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
  });
});
