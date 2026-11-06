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
  it("samples every few stops of each line, starting a few stops in, without duplicates", () => {
    const lines = [
      { stopIds: ["a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10", "a11", "a12"] },
      { stopIds: ["b0", "b1", "b2", "b3", "a4"] },
    ];
    expect(delayProbeStations(lines, 8)).toEqual(["a4", "a12"]);
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
