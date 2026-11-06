import type { GrelineApiClient } from "@greline/services";
import { describe, expect, it, vi } from "vitest";
import { mergeDelays, tramScheduleQueryOptions, tripDelaysQueryOptions } from "./use-trams";

const client: GrelineApiClient = {
  getDepartures: vi.fn(async () => []),
  getTramSchedule: vi.fn(async () => ({ serviceDate: "2026-11-06", patterns: [], trips: [] })),
  getTripDelays: vi.fn(async () => ({ "SEM:1": 90 })),
};
const signal = new AbortController().signal;
type QueryFn = (context: { signal: AbortSignal }) => unknown;

describe("tramScheduleQueryOptions", () => {
  it("loads the schedule from our API and refreshes it hourly (the service day changes at night)", async () => {
    const options = tramScheduleQueryOptions(client);
    await (options.queryFn as QueryFn)({ signal });
    expect(client.getTramSchedule).toHaveBeenCalledWith(signal);
    expect(options.refetchInterval).toBe(3_600_000);
  });
});

describe("tripDelaysQueryOptions", () => {
  it("refreshes every 30 s by default, and only while the page is visible", () => {
    const options = tripDelaysQueryOptions(client);
    expect(options.refetchInterval).toBe(30_000);
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
