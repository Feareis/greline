import { describe, expect, it } from "vitest";
import { minutesUntil } from "./time";

describe("minutesUntil", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("returns whole minutes until the departure", () => {
    expect(minutesUntil("2026-01-01T12:05:30Z", now)).toBe(5);
  });

  it("returns 0 for an imminent departure", () => {
    expect(minutesUntil("2026-01-01T12:00:40Z", now)).toBe(0);
  });

  it("never returns a negative value", () => {
    expect(minutesUntil("2026-01-01T11:58:00Z", now)).toBe(0);
  });
});
