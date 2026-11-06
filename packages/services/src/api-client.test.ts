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
