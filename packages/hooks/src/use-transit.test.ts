import type { GrelineApiClient } from "@greline/services";
import { describe, expect, it, vi } from "vitest";
import { mergeDelays, scheduleQueryOptions, tripDelaysQueryOptions } from "./use-transit";

const client: GrelineApiClient = {
  getDepartures: vi.fn(async () => []),
  getSchedule: vi.fn(async () => ({ serviceDate: "2026-11-06", shapes: [], patterns: [], trips: [] })),
  getTripDelays: vi.fn(async () => ({ "SEM:1": 90 })),
  getWeather: vi.fn(async () => ({ temperature: 9.6, apparentTemperature: 8.9, weatherCode: 3, isDay: false, windSpeed: 1.1, sunrise: "07:22", sunset: "17:18" })),
  getAirQuality: vi.fn(async () => ({ index: 52 })),
  getParkAndRides: vi.fn(async () => []),
  getStopAccessibility: vi.fn(async () => ({})),
  getDisruptions: vi.fn(async () => []),
  getItineraries: vi.fn(async () => []),
};
const signal = new AbortController().signal;
type QueryFn = (context: { signal: AbortSignal }) => unknown;

describe("scheduleQueryOptions", () => {
  it("loads the schedule from our API and refreshes it hourly (the service day changes at night)", async () => {
    const options = scheduleQueryOptions(client, "chrono");
    expect(options.queryKey).toEqual(["schedule", "chrono"]);
    await (options.queryFn as QueryFn)({ signal });
    expect(client.getSchedule).toHaveBeenCalledWith("chrono", signal);
    expect(options.refetchInterval).toBe(3_600_000);
  });
});

describe("tripDelaysQueryOptions", () => {
  it("refreshes every 15 s by default, and only while the page is visible", () => {
    const options = tripDelaysQueryOptions(client);
    expect(options.refetchInterval).toBe(15_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });

  it("uses the injected refresh interval", () => {
    expect(tripDelaysQueryOptions(client, 60_000).refetchInterval).toBe(60_000);
  });

  it("asks the injected client", async () => {
    await (tripDelaysQueryOptions(client).queryFn as QueryFn)({ signal });
    expect(client.getTripDelays).toHaveBeenCalledWith(signal);
  });
});

describe("mergeDelays", () => {
  it("keeps the last known delay of trams no longer seen at a probe station", () => {
    expect(mergeDelays({ "SEM:1": 90, "SEM:2": 30 }, { "SEM:2": 45, "SEM:3": 0 })).toEqual({ "SEM:1": 90, "SEM:2": 45, "SEM:3": 0 });
  });

  it("starts from the first answer", () => {
    expect(mergeDelays(undefined, { "SEM:1": 90 })).toEqual({ "SEM:1": 90 });
  });
});
