import type { TransitSchedule } from "@greline/types";
import { describe, expect, it } from "vitest";
import { findTrip, upcomingStops, vehicleKey, vehiclePositions } from "./vehicles";

const START = 1_793_956_000;

// One trip of line A over four stations: 0 s at a, 100 s at b, 100 s at c too (no run time), 300 s at d.
// Stations are 0, 400, 500 and 900 m along the track.
const schedule: TransitSchedule = {
  serviceDate: "2026-11-06",
  shapes: [
    [
      [5.7, 45.18],
      [5.71, 45.18],
    ],
  ],
  patterns: [{ lineId: "SEM:A", headsign: "Gares", stopIds: ["a", "b", "c", "d"], shape: 0, stopDistances: [0, 400, 500, 900] }],
  trips: [{ id: "SEM:1", pattern: 0, start: START, offsets: [0, 100, 100, 300] }],
};

describe("vehiclePositions", () => {
  it("shows no tram before departure or after arrival", () => {
    expect(vehiclePositions(schedule, {}, START - 1)).toEqual([]);
    expect(vehiclePositions(schedule, {}, START + 300)).toEqual([]);
  });

  it("interpolates between the two stations around the current time", () => {
    expect(vehiclePositions(schedule, {}, START + 50)).toEqual([
      { key: `SEM:1@${START}`, tripId: "SEM:1", lineId: "SEM:A", pattern: 0, distance: 200, delaySeconds: 0 },
    ]);
  });

  it("starts each segment at its station, skipping zero-length segments", () => {
    const [atB] = vehiclePositions(schedule, {}, START + 100);
    expect(atB).toMatchObject({ distance: 500 });
    expect(vehiclePositions(schedule, {}, START + 250)[0]).toMatchObject({ distance: 800 });
  });

  it("shifts the whole trip by its realtime delay", () => {
    const [late] = vehiclePositions(schedule, { "SEM:1": 60 }, START + 110);
    expect(late).toMatchObject({ distance: 200, delaySeconds: 60 });
    expect(vehiclePositions(schedule, { "SEM:1": 60 }, START + 30)).toEqual([]);
  });

  it("follows each trip independently", () => {
    const twoTrips = { ...schedule, trips: [...schedule.trips, { id: "SEM:2", pattern: 0, start: START + 200, offsets: [0, 100, 100, 300] }] };
    expect(vehiclePositions(twoTrips, {}, START + 250).map((v) => v.tripId)).toEqual(["SEM:1", "SEM:2"]);
  });
});

describe("findTrip", () => {
  it("finds a running trip by its vehicle key, in any of the schedules", () => {
    const other = { ...schedule, trips: [] };
    const key = vehicleKey(schedule.trips[0]!);
    expect(key).toBe(`SEM:1@${START}`);
    expect(findTrip([other, schedule], key)).toEqual({ schedule, trip: schedule.trips[0] });
  });

  it("finds nothing for a trip of another day or another network", () => {
    expect(findTrip([schedule], `SEM:1@${START - 86_400}`)).toBeNull();
    expect(findTrip([schedule], "SEM:9@1")).toBeNull();
  });
});

describe("upcomingStops", () => {
  const trip = schedule.trips[0]!;
  const pattern = schedule.patterns[0]!;

  it("lists the stops not left yet, with their estimated departure", () => {
    expect(upcomingStops(trip, pattern, 0, START + 50)).toEqual([
      { stopId: "b", time: START + 100 },
      { stopId: "c", time: START + 100 },
      { stopId: "d", time: START + 300 },
    ]);
  });

  it("shifts the times by the delay", () => {
    expect(upcomingStops(trip, pattern, 60, START + 150)).toEqual([
      { stopId: "b", time: START + 160 },
      { stopId: "c", time: START + 160 },
      { stopId: "d", time: START + 360 },
    ]);
  });

  it("is empty once the trip has reached its terminus", () => {
    expect(upcomingStops(trip, pattern, 0, START + 300)).toEqual([]);
  });
});
