import { describe, expect, it } from "vitest";
import { moonState } from "./moon";

describe("moonState", () => {
  it("finds the phases of January 2024 (new 11th, first quarter 18th, full 25th, last quarter 4th)", () => {
    expect(moonState(new Date("2024-01-11T11:57:00Z")).phase).toBe("new");
    expect(moonState(new Date("2024-01-18T03:53:00Z")).phase).toBe("firstQuarter");
    expect(moonState(new Date("2024-01-25T17:54:00Z")).phase).toBe("full");
    expect(moonState(new Date("2024-01-04T03:30:00Z")).phase).toBe("lastQuarter");
    expect(moonState(new Date("2024-01-14T12:00:00Z")).phase).toBe("waxingCrescent");
  });

  it("measures the lit fraction of the disc", () => {
    expect(moonState(new Date("2024-01-11T11:57:00Z")).illumination).toBeLessThan(0.01);
    expect(moonState(new Date("2024-01-25T17:54:00Z")).illumination).toBeGreaterThan(0.99);
    // The mean-lunation model is up to ~half a day off, i.e. a few percent of illumination.
    expect(Math.abs(moonState(new Date("2024-01-18T03:53:00Z")).illumination - 0.5)).toBeLessThan(0.1);
  });

  it("handles dates before the reference new moon", () => {
    expect(moonState(new Date("1999-12-22T17:31:00Z")).phase).toBe("full");
  });
});
