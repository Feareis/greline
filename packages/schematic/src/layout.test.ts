import { describe, expect, it } from "vitest";
import { compressRadially, snapStationsToGrid } from "./layout";

describe("compressRadially", () => {
  const points = new Map([
    ["center", { x: 0, y: 0 }],
    ["half", { x: 50, y: 0 }],
    ["far", { x: 0, y: -100 }],
  ]);

  it("keeps the center and the farthest point in place", () => {
    const result = compressRadially(points, 0.7);
    expect(result.get("center")).toEqual({ x: 0, y: 0 });
    expect(result.get("far")!.y).toBeCloseTo(-100, 9);
  });

  it("pushes inner points outward along their direction", () => {
    const half = compressRadially(points, 0.7).get("half")!;
    expect(half.x).toBeCloseTo(100 * 0.5 ** 0.7, 9);
    expect(half.y).toBeCloseTo(0, 9);
  });

  it("is the identity with exponent 1", () => {
    expect(compressRadially(points, 1).get("half")!.x).toBeCloseTo(50, 9);
  });
});

describe("snapStationsToGrid", () => {
  it("snaps every station to the nearest grid node", () => {
    const result = snapStationsToGrid(new Map([["a", { x: 13, y: 3 }]]), 8);
    expect(result.get("a")).toEqual({ x: 16, y: 0 });
  });

  it("moves a colliding station to the nearest free node", () => {
    const result = snapStationsToGrid(
      new Map([
        ["a", { x: 1, y: 0 }],
        ["b", { x: 3, y: 0 }],
      ]),
      8,
    );
    expect(result.get("a")).toEqual({ x: 0, y: 0 });
    expect(result.get("b")).toEqual({ x: 8, y: 0 });
  });

  it("gives every station a distinct node", () => {
    const crowded = new Map(Array.from({ length: 9 }, (_, i) => [`s${i}`, { x: i * 0.1, y: 0 }]));
    const keys = [...snapStationsToGrid(crowded, 8).values()].map(({ x, y }) => `${x},${y}`);
    expect(new Set(keys).size).toBe(9);
  });
});
