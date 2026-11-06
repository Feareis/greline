import { describe, expect, it } from "vitest";
import { createLocalProjection, distanceToPolylineMeters } from "./geo";

describe("createLocalProjection", () => {
  const project = createLocalProjection([5.72, 45.18]);

  it("maps the origin to (0, 0)", () => {
    expect(project([5.72, 45.18])).toEqual({ x: 0, y: 0 });
  });

  it("returns meters with y pointing down (north is up)", () => {
    const north = project([5.72, 45.19]);
    expect(north.x).toBeCloseTo(0, 6);
    expect(north.y).toBeCloseTo(-1111.95, 1);
  });

  it("shrinks longitude degrees by cos(latitude)", () => {
    expect(project([5.73, 45.18]).x).toBeCloseTo(784.0, 0);
  });
});

describe("distanceToPolylineMeters", () => {
  const eastWest: [number, number][] = [
    [5.7, 45.18],
    [5.74, 45.18],
  ];

  it("is zero for a point on the line", () => {
    expect(distanceToPolylineMeters([5.72, 45.18], eastWest)).toBeCloseTo(0, 6);
  });

  it("measures the perpendicular distance to a segment", () => {
    expect(distanceToPolylineMeters([5.72, 45.181], eastWest)).toBeCloseTo(111.2, 0);
  });

  it("measures to the nearest endpoint past the end of the line", () => {
    expect(distanceToPolylineMeters([5.75, 45.18], eastWest)).toBeCloseTo(784.0, 0);
  });

  it("takes the nearest of several segments", () => {
    const bent: [number, number][] = [...eastWest, [5.74, 45.2]];
    expect(distanceToPolylineMeters([5.7405, 45.19], bent)).toBeCloseTo(39.2, 0);
  });
});
