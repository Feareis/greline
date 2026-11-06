import type { Stop } from "@greline/types";
import { describe, expect, it } from "vitest";
import { distanceMeters, nearestStops } from "./geo";

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
