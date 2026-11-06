import { mStopTimesSchema } from "@greline/validation";
import { describe, expect, it, vi } from "vitest";
import gares from "./__fixtures__/m-stoptimes-gares.json";
import { fetchStopDepartures } from "./fetch-departures";
import { MApiError } from "./fetch-network";
import { toDepartures } from "./to-departures";

// Real stoptimes of the Gares station (2026-11-06 ~10:06): trams A and B, bus C1, coach SE2.
const stopTimes = mStopTimesSchema.parse(gares);
const tramLines = new Set(["SEM:A", "SEM:B"]);

describe("toDepartures", () => {
  const departures = toDepartures(stopTimes, "SEM:GENGAR", tramLines);

  it("keeps only the requested (tram) lines", () => {
    expect(new Set(departures.map((d) => d.lineId))).toEqual(tramLines);
    expect(departures).toHaveLength(5);
  });

  it("uses the realtime estimate and the pattern headsign", () => {
    expect(departures[0]).toEqual({
      lineId: "SEM:B",
      stopId: "SEM:GENGAR",
      headsign: "Plaine des Sports",
      departureTime: "2026-11-06T09:06:48.000Z",
      realtime: true,
    });
  });

  it("falls back to the scheduled time for trips without realtime data", () => {
    const scheduled = departures.filter((d) => !d.realtime);
    expect(scheduled).toEqual([expect.objectContaining({ lineId: "SEM:A", departureTime: "2026-11-06T09:11:00.000Z" })]);
  });
});

describe("fetchStopDepartures", () => {
  it("requests the cluster code, encoded, with the origin header", async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(gares));
    const departures = await fetchStopDepartures("SEM:GENGAR", tramLines, fetchSpy);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://data.mobilites-m.fr/api/routers/default/index/clusters/SEM%3AGENGAR/stoptimes");
    expect(new Headers(init?.headers).get("origin")).toBe("greline");
    expect(departures).toHaveLength(5);
  });

  it("reads an empty 204 answer as no departures", async () => {
    const noContent = vi.fn(async () => new Response(null, { status: 204 }));
    await expect(fetchStopDepartures("SEM:GENGAR", tramLines, noContent)).resolves.toEqual([]);
  });

  it("rejects with MApiError when the M API fails", async () => {
    const failing = vi.fn(async () => new Response("down", { status: 503 }));
    await expect(fetchStopDepartures("SEM:GENGAR", tramLines, failing)).rejects.toThrow(MApiError);
  });
});
