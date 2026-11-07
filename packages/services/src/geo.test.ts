import type { Stop } from "@greline/types";
import { describe, expect, it } from "vitest";
import {
  bearingDegrees,
  createLocalProjection,
  cumulativeDistances,
  distanceMeters,
  distanceToPolylineMeters,
  nearestStops,
  locateOnPolyline,
  pointAtDistance,
  slicePolyline,
} from "./geo";

const stop = (id: string, lat: number, lon: number): Stop => ({ id, name: id, city: "Grenoble", lat, lon });

describe("distanceMeters", () => {
  it("is zero between a point and itself", () => {
    expect(distanceMeters({ lat: 45.19, lon: 5.72 }, { lat: 45.19, lon: 5.72 })).toBe(0);
  });

  it("measures one degree of latitude as ~111.2 km", () => {
    expect(distanceMeters({ lat: 45, lon: 5.72 }, { lat: 46, lon: 5.72 })).toBeCloseTo(111_195, -1);
  });

  it("shrinks longitude degrees with latitude (great-circle distance)", () => {
    expect(distanceMeters({ lat: 45, lon: 5 }, { lat: 45, lon: 6 })).toBeCloseTo(78_627, -2);
  });

  it("is symmetric", () => {
    const gares = { lat: 45.19152, lon: 5.71436 };
    const chavant = { lat: 45.18638, lon: 5.73127 };
    expect(distanceMeters(gares, chavant)).toBeCloseTo(distanceMeters(chavant, gares), 9);
  });
});

describe("nearestStops", () => {
  const here = { lat: 45.19, lon: 5.72 };
  const stops = [
    stop("far", 45.25, 5.72),
    stop("near", 45.1905, 5.72),
    stop("middle", 45.2, 5.72),
    stop("closest", 45.19, 5.7201),
  ];

  it("returns the requested number of stops, closest first, with their distance", () => {
    const nearest = nearestStops(here, stops, 3);
    expect(nearest.map((n) => n.stop.id)).toEqual(["closest", "near", "middle"]);
    expect(nearest[0]!.distanceMeters).toBeCloseTo(7.9, 0);
  });

  it("returns every stop when fewer exist than requested", () => {
    expect(nearestStops(here, stops.slice(0, 2), 3)).toHaveLength(2);
  });

  it("does not reorder the input array", () => {
    nearestStops(here, stops, 3);
    expect(stops[0]!.id).toBe("far");
  });
});
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

describe("cumulativeDistances", () => {
  it("adds up segment lengths from the first point", () => {
    const [start, middle, end] = cumulativeDistances([
      [5.72, 45.18],
      [5.72, 45.19],
      [5.72, 45.2],
    ]);
    expect(start).toBe(0);
    expect(middle).toBeCloseTo(1112, 0);
    expect(end).toBeCloseTo(2224, 0);
  });
});

describe("bearingDegrees", () => {
  it("measures clockwise from north", () => {
    expect(bearingDegrees([5.72, 45.18], [5.72, 45.19])).toBeCloseTo(0, 6);
    expect(bearingDegrees([5.72, 45.18], [5.73, 45.18])).toBeCloseTo(90, 6);
    expect(bearingDegrees([5.72, 45.19], [5.72, 45.18])).toBeCloseTo(180, 6);
    expect(bearingDegrees([5.73, 45.18], [5.72, 45.18])).toBeCloseTo(270, 6);
  });
});

describe("pointAtDistance", () => {
  // North for ~1112 m, then east for ~784 m.
  const track: [number, number][] = [
    [5.72, 45.18],
    [5.72, 45.19],
    [5.73, 45.19],
  ];
  const cumulative = cumulativeDistances(track);

  it("interpolates inside the segment holding the distance, with its direction", () => {
    const point = pointAtDistance(track, cumulative, cumulative[1]! / 2);
    expect(point.lon).toBeCloseTo(5.72, 9);
    expect(point.lat).toBeCloseTo(45.185, 6);
    expect(point.bearing).toBeCloseTo(0, 6);
    expect(pointAtDistance(track, cumulative, cumulative[1]! + 10).bearing).toBeCloseTo(90, 6);
  });

  it("clamps to the ends of the track", () => {
    expect(pointAtDistance(track, cumulative, -5)).toMatchObject({ lon: 5.72, lat: 45.18 });
    expect(pointAtDistance(track, cumulative, 99_999)).toMatchObject({ lon: 5.73, lat: 45.19 });
  });
});

describe("locateOnPolyline and slicePolyline", () => {
  // North for ~1112 m, then east for ~784 m.
  const track: [number, number][] = [
    [5.72, 45.18],
    [5.72, 45.19],
    [5.73, 45.19],
  ];
  const cumulative = cumulativeDistances(track);

  it("finds how far along the track a nearby point lies", () => {
    const located = locateOnPolyline([5.7201, 45.185], track, cumulative);
    expect(located.along).toBeCloseTo(cumulative[1]! / 2, 0);
    expect(located.offset).toBeCloseTo(7.9, 0);
  });

  it("cuts the track between two distances, keeping the corners in between", () => {
    expect(slicePolyline(track, cumulative, cumulative[1]! + 100, 500)).toEqual([
      [5.72, expect.closeTo(45.1845, 4)],
      [5.72, 45.19],
      [expect.closeTo(5.7213, 4), 45.19],
    ]);
  });
});
