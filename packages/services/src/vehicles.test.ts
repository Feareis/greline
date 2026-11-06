import type { TramSchedule } from "@greline/types";
import { describe, expect, it } from "vitest";
import { vehiclePositions } from "./vehicles";

const START = 1_793_956_000;

// One trip of line A over four stations: 0 s at a, 100 s at b, 100 s at c too (no run time), 300 s at d.
const schedule: TramSchedule = {
  serviceDate: "2026-11-06",
  patterns: [{ lineId: "SEM:A", headsign: "Gares", stopIds: ["a", "b", "c", "d"] }],
  trips: [{ id: "SEM:1", pattern: 0, start: START, offsets: [0, 100, 100, 300] }],
};

describe("vehiclePositions", () => {
  it("shows no tram before departure or after arrival", () => {
    expect(vehiclePositions(schedule, {}, START - 1)).toEqual([]);
    expect(vehiclePositions(schedule, {}, START + 300)).toEqual([]);
  });

  it("interpolates between the two stations around the current time", () => {
    expect(vehiclePositions(schedule, {}, START + 50)).toEqual([
      { key: `SEM:1@${START}`, tripId: "SEM:1", lineId: "SEM:A", fromStopId: "a", toStopId: "b", progress: 0.5, delaySeconds: 0 },
    ]);
  });

  it("starts each segment at its station, skipping zero-length segments", () => {
    const [atB] = vehiclePositions(schedule, {}, START + 100);
    expect(atB).toMatchObject({ fromStopId: "c", toStopId: "d", progress: 0 });
    expect(vehiclePositions(schedule, {}, START + 250)[0]).toMatchObject({ fromStopId: "c", progress: 0.75 });
  });

  it("shifts the whole trip by its realtime delay", () => {
    const [late] = vehiclePositions(schedule, { "SEM:1": 60 }, START + 110);
    expect(late).toMatchObject({ fromStopId: "a", toStopId: "b", progress: 0.5, delaySeconds: 60 });
    expect(vehiclePositions(schedule, { "SEM:1": 60 }, START + 30)).toEqual([]);
  });

  it("follows each trip independently", () => {
    const twoTrips = { ...schedule, trips: [...schedule.trips, { id: "SEM:2", pattern: 0, start: START + 200, offsets: [0, 100, 100, 300] }] };
    expect(vehiclePositions(twoTrips, {}, START + 250).map((v) => v.tripId)).toEqual(["SEM:1", "SEM:2"]);
  });
});
