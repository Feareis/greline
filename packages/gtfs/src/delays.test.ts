import { mStopTimesSchema } from "@greline/validation";
import { describe, expect, it, vi } from "vitest";
import gares from "./__fixtures__/m-stoptimes-gares.json";
import { delayProbeStations, fetchTripDelays, toTripDelays } from "./delays";
import { MApiError } from "./fetch-network";

const time = (tripId: string, scheduled: number, realtime: number, isRealtime = true) => ({
  tripId,
  scheduledDeparture: scheduled,
  realtimeDeparture: realtime,
  realtime: isRealtime,
  serviceDay: 1793919600,
});
const pattern = { id: "SEM:A:0:1", desc: "La Poya" };

describe("delayProbeStations", () => {
  const stops = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i}`);

  it("probes every line at least every 8 stops for trams, 12 for buses", () => {
    expect(delayProbeStations([{ mode: "tram", stopIds: stops("a", 17) }])).toEqual(["a0", "a8", "a16"]);
    expect(delayProbeStations([{ mode: "bus", stopIds: stops("b", 17) }])).toEqual(["b0", "b12"]);
  });

  it("prefers stations shared by several lines, and reuses them for every line", () => {
    const tram = { mode: "tram" as const, stopIds: ["a0", "a1", "hub", "a3", "a4"] };
    const bus = { mode: "bus" as const, stopIds: ["b0", "hub", "b2"] };
    expect(delayProbeStations([tram, bus])).toEqual(["hub"]);
  });
});

describe("toTripDelays", () => {
  const trams = new Set(["SEM:A", "SEM:B"]);

  it("measures the delay of realtime trips only", () => {
    const delays = toTripDelays([[{ pattern, times: [time("SEM:1", 36000, 36090), time("SEM:2", 36300, 36300, false)] }]], trams);
    expect(delays).toEqual({ "SEM:1": 90 });
  });

  it("keeps the measure taken closest to the vehicle when a trip is seen at several stations", () => {
    const delays = toTripDelays(
      [[{ pattern, times: [time("SEM:1", 36600, 36780)] }], [{ pattern, times: [time("SEM:1", 36000, 36060)] }]],
      trams,
    );
    expect(delays).toEqual({ "SEM:1": 60 });
  });

  it("ignores buses and coaches stopping at the same stations", () => {
    const coach = { pattern: { id: "SE2:86:0:2125254748", desc: "Gare Routiere" }, times: [time("SE2:9", 36000, 52640)] };
    expect(toTripDelays([[coach, { pattern, times: [time("SEM:1", 36000, 36030)] }]], trams)).toEqual({ "SEM:1": 30 });
  });

  it("reads real M API stoptimes", () => {
    expect(toTripDelays([mStopTimesSchema.parse(gares)], trams)["SEM:32165104"]).toBe(48);
  });
});

describe("fetchTripDelays", () => {
  it("merges the delays of every probe station", async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(gares));
    const result = await fetchTripDelays(["SEM:GENGAR", "SEM:GENVH"], new Set(["SEM:A", "SEM:B"]), fetchSpy);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.delays["SEM:32165104"]).toBe(48);
    expect(result.failedStations).toBe(0);
  });

  it("tolerates some failing stations and reports them", async () => {
    const fetchSpy = vi.fn(async (url: string) => (url.includes("GENVH") ? new Response("down", { status: 503 }) : Response.json(gares)));
    const result = await fetchTripDelays(["SEM:GENGAR", "SEM:GENVH"], new Set(["SEM:A", "SEM:B"]), fetchSpy);
    expect(result.failedStations).toBe(1);
    expect(result.delays["SEM:32165104"]).toBe(48);
  });

  it("rejects with MApiError when every station fails", async () => {
    const failing = vi.fn(async () => new Response("down", { status: 503 }));
    await expect(fetchTripDelays(["SEM:GENGAR", "SEM:GENVH"], new Set(["SEM:A"]), failing)).rejects.toThrow(MApiError);
  });
});
