import type { SchematicPoint } from "@greline/types";
import { describe, expect, it } from "vitest";
import { buildLinePaths, routeEdge } from "./routing";

const segmentAngles = (points: SchematicPoint[]): number[] =>
  points.slice(1).map((p, i) => {
    const previous = points[i]!;
    return (Math.atan2(p.y - previous.y, p.x - previous.x) * 180) / Math.PI;
  });

const isOctilinear = (angle: number): boolean => Math.abs(angle / 45 - Math.round(angle / 45)) < 1e-9;

describe("routeEdge", () => {
  it("keeps a straight horizontal edge as a single segment", () => {
    expect(routeEdge({ x: 0, y: 0 }, { x: 16, y: 0 })).toEqual([
      { x: 0, y: 0 },
      { x: 16, y: 0 },
    ]);
  });

  it("adds one bend: diagonal first, then straight", () => {
    expect(routeEdge({ x: 0, y: 0 }, { x: 10, y: 4 })).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      { x: 10, y: 4 },
    ]);
  });

  it("only produces 0/45/90 degree segments", () => {
    for (const to of [{ x: 7, y: -23 }, { x: -40, y: 9 }, { x: 5, y: 5 }, { x: 0, y: -12 }]) {
      expect(segmentAngles(routeEdge({ x: 0, y: 0 }, to)).every(isOctilinear)).toBe(true);
    }
  });
});

describe("buildLinePaths", () => {
  const positions = new Map([
    ["west", { x: 0, y: 0 }],
    ["east", { x: 32, y: 0 }],
    ["south", { x: 32, y: 32 }],
  ]);

  it("draws a lone line exactly through its stations", () => {
    const [path] = buildLinePaths([{ id: "A", stationIds: ["west", "east"] }], positions, 4);
    expect(path).toEqual({ lineId: "A", points: [{ x: 0, y: 0 }, { x: 32, y: 0 }] });
  });

  it("separates lines sharing an edge by the given spacing", () => {
    const [a, b] = buildLinePaths(
      [
        { id: "A", stationIds: ["west", "east"] },
        { id: "B", stationIds: ["west", "east"] },
      ],
      positions,
      4,
    );
    expect(a!.points.map((p) => p.y)).toEqual([-2, -2]);
    expect(b!.points.map((p) => p.y)).toEqual([2, 2]);
  });

  it("keeps a line on the same side whatever its travel direction", () => {
    const [, reversedB] = buildLinePaths(
      [
        { id: "A", stationIds: ["west", "east"] },
        { id: "B", stationIds: ["east", "west"] },
      ],
      positions,
      4,
    );
    expect(reversedB!.points).toEqual([{ x: 32, y: 2 }, { x: 0, y: 2 }]);
  });

  it("joins offset segments at a corner with a miter", () => {
    const [a] = buildLinePaths(
      [
        { id: "A", stationIds: ["west", "east", "south"] },
        { id: "B", stationIds: ["west", "east", "south"] },
      ],
      positions,
      4,
    );
    expect(a!.points).toEqual([{ x: 0, y: -2 }, { x: 34, y: -2 }, { x: 34, y: 32 }]);
  });
});
