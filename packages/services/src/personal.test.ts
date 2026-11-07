import type { Departure, NetworkLine } from "@greline/types";
import { describe, expect, it } from "vitest";
import { directTripLegs, parseFavorites, parseTrip, toggleFavorite, tripDepartures } from "./personal";

describe("favorites", () => {
  it("reads back valid stop ids only, once each, in order", () => {
    expect(parseFavorites(["SEM:GENGAR", "SEM:GENCHV", "SEM:GENGAR", "../etc", 42])).toEqual(["SEM:GENGAR", "SEM:GENCHV"]);
    expect(parseFavorites({ not: "a list" })).toEqual([]);
  });

  it("adds a stop at the end, or removes it", () => {
    expect(toggleFavorite(["SEM:GENGAR"], "SEM:GENCHV")).toEqual(["SEM:GENGAR", "SEM:GENCHV"]);
    expect(toggleFavorite(["SEM:GENGAR", "SEM:GENCHV"], "SEM:GENGAR")).toEqual(["SEM:GENCHV"]);
  });
});

describe("parseTrip", () => {
  it("keeps valid ends and drops the rest", () => {
    expect(parseTrip({ from: "SEM:GENGAR", to: "SEM:GENCHV" })).toEqual({ from: "SEM:GENGAR", to: "SEM:GENCHV" });
    expect(parseTrip({ from: "SEM:GENGAR", to: "nope" })).toEqual({ from: "SEM:GENGAR", to: null });
    expect(parseTrip("garbage")).toEqual({ from: null, to: null });
  });
});

const line = (id: string, directions: Record<string, string[]>) =>
  ({ id, directions: Object.entries(directions).map(([direction, stopIds]) => ({ id: direction, stopIds })) }) as NetworkLine;

describe("directTripLegs", () => {
  const lines = [line("SEM:A", { "0": ["a", "b", "c"], "1": ["c", "b", "a"] }), line("SEM:C1", { "0": ["x", "b", "c"], "1": ["c", "x"] })];

  it("finds each line and direction passing the start, then the end", () => {
    expect(directTripLegs(lines, "b", "c")).toEqual([
      { lineId: "SEM:A", direction: "0" },
      { lineId: "SEM:C1", direction: "0" },
    ]);
    expect(directTripLegs(lines, "c", "a")).toEqual([{ lineId: "SEM:A", direction: "1" }]);
  });

  it("finds nothing without a direct line", () => {
    expect(directTripLegs(lines, "a", "x")).toEqual([]);
    expect(directTripLegs(lines, "b", "b")).toEqual([]);
  });
});

describe("tripDepartures", () => {
  const departure = (lineId: string, direction: string, time: string): Departure => ({
    lineId,
    stopId: "b",
    direction,
    headsign: "",
    departureTime: `2026-11-07T${time}:00.000Z`,
    realtime: true,
  });

  it("keeps the departures of the trip's legs, soonest first", () => {
    const legs = [
      { lineId: "SEM:A", direction: "0" },
      { lineId: "SEM:C1", direction: "0" },
    ];
    const kept = tripDepartures(
      [departure("SEM:A", "0", "10:12"), departure("SEM:A", "1", "10:01"), departure("SEM:C1", "0", "10:05"), departure("SEM:B", "0", "10:00")],
      legs,
    );
    expect(kept.map((d) => `${d.lineId} ${d.departureTime.slice(11, 16)}`)).toEqual(["SEM:C1 10:05", "SEM:A 10:12"]);
  });
});
