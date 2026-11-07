import type { Stop } from "@greline/types";
import { describe, expect, it } from "vitest";
import { itineraryEndParam, resolveItineraryEnd } from "./itinerary-end";

const stops: Stop[] = [{ id: "SEM:GENCHV", name: "Chavant", city: "Grenoble", lat: 45.18427, lon: 5.73163 }];

describe("itineraryEndParam", () => {
  it("writes a stop as its id and a position rounded to about 100 m", () => {
    expect(itineraryEndParam({ kind: "stop", stopId: "SEM:GENCHV" })).toBe("SEM:GENCHV");
    expect(itineraryEndParam({ kind: "position", lat: 45.188494, lon: 5.72451 })).toBe("45.188,5.725");
  });
});

describe("resolveItineraryEnd", () => {
  it("places a stop at its position", () => {
    expect(resolveItineraryEnd({ kind: "stop", stopId: "SEM:GENCHV" }, stops)).toEqual({ lat: 45.18427, lon: 5.73163 });
    expect(resolveItineraryEnd({ kind: "stop", stopId: "SEM:NOPE" }, stops)).toBe("unknown_stop");
  });

  it("keeps positions near the network only", () => {
    expect(resolveItineraryEnd({ kind: "position", lat: 45.19, lon: 5.73 }, stops)).toEqual({ lat: 45.19, lon: 5.73 });
    // Lyon: 95 km away.
    expect(resolveItineraryEnd({ kind: "position", lat: 45.76, lon: 4.84 }, stops)).toBe("outside_service_area");
  });
});
