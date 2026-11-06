import { describe, expect, it } from "vitest";
import { placeLabels } from "./labels";

const candidate = (id: string, x: number, y: number, text = "Station") => ({
  id,
  anchor: { x, y },
  offset: 4,
  text,
});

describe("placeLabels", () => {
  it("puts labels on the right when there is room", () => {
    const sides = placeLabels([candidate("a", 0, 0), candidate("b", 0, 100)], 10);
    expect(sides.get("a")).toBe("right");
    expect(sides.get("b")).toBe("right");
  });

  it("falls back to the left side when the right one is taken", () => {
    const sides = placeLabels([candidate("a", 0, 0), candidate("b", 2, 2)], 10);
    expect(sides.get("a")).toBe("right");
    expect(sides.get("b")).toBe("left");
  });

  it("drops a label that fits on neither side, keeping earlier (higher priority) ones", () => {
    const sides = placeLabels([candidate("a", 0, 0), candidate("b", 1, 1), candidate("c", 2, 2)], 10);
    expect([...sides.keys()]).toEqual(["a", "b"]);
  });

  it("lets labels on separate rows overlap horizontally", () => {
    const sides = placeLabels([candidate("a", 0, 0), candidate("b", 0, 11)], 10);
    expect(sides.get("b")).toBe("right");
  });
});
