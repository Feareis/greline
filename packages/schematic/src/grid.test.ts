import { describe, expect, it } from "vitest";
import { snapAngle, snapToGrid } from "./grid";

describe("schematic helpers", () => {
  it("snaps coordinates to the grid", () => {
    expect(snapToGrid(13)).toBe(16);
    expect(snapToGrid(11)).toBe(8);
  });

  it("snaps angles to multiples of 45 degrees", () => {
    expect(snapAngle(30)).toBe(45);
    expect(snapAngle(-10)).toBe(0);
    expect(snapAngle(350)).toBe(0);
  });
});
