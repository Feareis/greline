import { describe, expect, it, vi } from "vitest";
import { createApiClient, GrelineApiError } from "./api-client";

const departure = {
  lineId: "SEM:A",
  stopId: "SEM:GENGAR",
  headsign: "La Poya",
  departureTime: "2026-11-06T09:06:48.000Z",
  realtime: true,
};

const answering = (response: Response) => vi.fn(async (_url: string, _init?: RequestInit) => response);

describe("createApiClient().getDepartures", () => {
  it("calls our API under the injected base URL, with the stop id encoded", async () => {
    const fetchSpy = answering(Response.json({ departures: [departure] }));
    const client = createApiClient({ baseUrl: "https://greline.example/", fetch: fetchSpy });
    await expect(client.getDepartures("SEM:GENGAR")).resolves.toEqual([departure]);
    expect(fetchSpy.mock.calls[0]![0]).toBe("https://greline.example/api/stops/SEM%3AGENGAR/departures");
  });

  it("works with a relative base URL (same-origin web app)", async () => {
    const fetchSpy = answering(Response.json({ departures: [] }));
    await createApiClient({ baseUrl: "", fetch: fetchSpy }).getDepartures("SEM:GENGAR");
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/stops/SEM%3AGENGAR/departures");
  });

  it("forwards the abort signal so stale requests can be cancelled", async () => {
    const fetchSpy = answering(Response.json({ departures: [] }));
    const controller = new AbortController();
    await createApiClient({ baseUrl: "", fetch: fetchSpy }).getDepartures("SEM:GENGAR", controller.signal);
    expect(fetchSpy.mock.calls[0]![1]?.signal).toBe(controller.signal);
  });

  it("turns an API error into a GrelineApiError carrying status and code", async () => {
    const client = createApiClient({ baseUrl: "", fetch: answering(Response.json({ error: "unknown_stop" }, { status: 404 })) });
    await expect(client.getDepartures("SEM:GENZZZZ")).rejects.toMatchObject({ status: 404, code: "unknown_stop" });
  });

  it("still reports the status when the error body is not JSON", async () => {
    const client = createApiClient({ baseUrl: "", fetch: answering(new Response("Bad Gateway", { status: 502 })) });
    const error = await client.getDepartures("SEM:GENGAR").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GrelineApiError);
    expect(error).toMatchObject({ status: 502, code: "http_error" });
  });

  it("rejects a malformed success payload instead of passing it on", async () => {
    const client = createApiClient({ baseUrl: "", fetch: answering(Response.json({ departures: [{ lineId: "SEM:A" }] })) });
    await expect(client.getDepartures("SEM:GENGAR")).rejects.toMatchObject({ code: "invalid_response" });
  });
});

describe("createApiClient() tram endpoints", () => {
  const schedule = {
    serviceDate: "2026-11-06",
    shapes: [
      [
        [5.67, 45.19],
        [5.71, 45.19],
      ],
    ],
    patterns: [{ lineId: "SEM:A", headsign: "Gares", stopIds: ["SEM:GENLP", "SEM:GENGAR"], shape: 0, stopDistances: [0, 3150] }],
    trips: [{ id: "SEM:1", pattern: 0, start: 1793956000, offsets: [0, 600] }],
  };

  it("fetches the tram schedule of the day", async () => {
    const fetchSpy = answering(Response.json(schedule));
    await expect(createApiClient({ baseUrl: "", fetch: fetchSpy }).getTramSchedule()).resolves.toEqual(schedule);
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/network/trams/schedule");
  });

  it("fetches the realtime trip delays", async () => {
    const fetchSpy = answering(Response.json({ delays: { "SEM:1": 90 } }));
    await expect(createApiClient({ baseUrl: "", fetch: fetchSpy }).getTripDelays()).resolves.toEqual({ "SEM:1": 90 });
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/network/trams/delays");
  });

  it("reports API errors of the tram endpoints the same way", async () => {
    const client = createApiClient({ baseUrl: "", fetch: answering(Response.json({ error: "upstream_unavailable" }, { status: 502 })) });
    await expect(client.getTripDelays()).rejects.toMatchObject({ status: 502, code: "upstream_unavailable" });
  });

  it("fetches the weather and rejects a malformed one", async () => {
    const weather = { temperature: 9.6, apparentTemperature: 8.9, weatherCode: 3, isDay: false, windSpeed: 1.1, sunrise: "07:22", sunset: "17:18" };
    const fetchSpy = answering(Response.json(weather));
    await expect(createApiClient({ baseUrl: "", fetch: fetchSpy }).getWeather()).resolves.toEqual(weather);
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/weather");
    const broken = createApiClient({ baseUrl: "", fetch: answering(Response.json({ ...weather, sunrise: "7h22" })) });
    await expect(broken.getWeather()).rejects.toMatchObject({ code: "invalid_response" });
  });
});
