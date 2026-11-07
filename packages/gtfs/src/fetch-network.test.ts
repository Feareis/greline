import { describe, expect, it, vi } from "vitest";
import sample from "./__fixtures__/m-tram-sample.json";
import { fetchTransitNetwork, MApiError } from "./fetch-network";

function fakeFetch(override?: (url: string) => Response | undefined) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const overridden = override?.(url);
    if (overridden) return overridden;
    if (url.includes("/index/routes")) return Response.json(sample.routes);
    if (url.includes("/lines/json")) return Response.json(sample.shapes);
    const routeId = new URL(url).searchParams.get("route") ?? "";
    return Response.json(sample.timesheets[routeId as keyof typeof sample.timesheets]);
  });
}

describe("fetchTransitNetwork", () => {
  it("fetches, validates and converts the tram network", async () => {
    const network = await fetchTransitNetwork(fakeFetch());
    expect(network.lines.map((l) => l.id)).toEqual(["SEM:A", "SEM:C", "SEM:E"]);
  });

  it("identifies itself with the origin header required by the M API", async () => {
    const fetchSpy = fakeFetch();
    await fetchTransitNetwork(fetchSpy);
    for (const [, init] of fetchSpy.mock.calls as unknown as [string, RequestInit][]) {
      expect(new Headers(init.headers).get("origin")).toBe("greline");
    }
  });

  it("asks shapes only for the tram routes it found", async () => {
    const fetchSpy = fakeFetch();
    await fetchTransitNetwork(fetchSpy);
    const shapesUrl = fetchSpy.mock.calls.map(([url]) => String(url)).find((u) => u.includes("/lines/json"));
    expect(new URL(shapesUrl!).searchParams.get("codes")).toBe("SEM_A,SEM_C,SEM_E");
  });

  it("asks timesheets for noon in Grenoble: at night the M API lists no stop for the current time", async () => {
    const fetchSpy = fakeFetch();
    await fetchTransitNetwork(fetchSpy, new Date("2026-11-07T00:10:00+01:00"));
    const timesheetUrl = fetchSpy.mock.calls.map(([url]) => String(url)).find((u) => u.includes("/ficheHoraires"));
    // Noon in Paris on 2026-11-07 (winter time, UTC+1), in milliseconds.
    expect(new URL(timesheetUrl!).searchParams.get("time")).toBe(String(Date.UTC(2026, 10, 7, 11)));
  });

  it("keeps a line without service that day (empty timesheet) with its shape and no stops", async () => {
    const noServiceOnE = fakeFetch((url) => (url.includes("route=SEM%3AE") ? new Response(null, { status: 204 }) : undefined));
    const network = await fetchTransitNetwork(noServiceOnE);
    const lineE = network.lines.find((line) => line.id === "SEM:E")!;
    expect(lineE.stopIds).toEqual([]);
    expect(lineE.shape.length).toBeGreaterThan(0);
  });

  it("retries a transient failure (5xx, network error) before giving up", async () => {
    let routesCalls = 0;
    const flaky = fakeFetch((url) => {
      if (!url.includes("/index/routes")) return undefined;
      routesCalls += 1;
      if (routesCalls === 1) return new Response("busy", { status: 503 });
      if (routesCalls === 2) throw new TypeError("fetch failed");
      return undefined;
    });
    const network = await fetchTransitNetwork(flaky);
    expect(network.lines.length).toBeGreaterThan(0);
    expect(routesCalls).toBe(3);
  });

  it("does not retry a client error", async () => {
    const notFound = fakeFetch((url) => (url.includes("/index/routes") ? new Response("no", { status: 404 }) : undefined));
    await expect(fetchTransitNetwork(notFound)).rejects.toThrow(MApiError);
    expect(notFound.mock.calls.filter(([url]) => String(url).includes("/index/routes"))).toHaveLength(1);
  });

  it("rejects with MApiError on an HTTP error", async () => {
    const failing = fakeFetch((url) => (url.includes("/index/routes") ? new Response("down", { status: 503 }) : undefined));
    await expect(fetchTransitNetwork(failing)).rejects.toThrow(MApiError);
  });

  it("rejects with MApiError on an unexpected payload", async () => {
    const garbled = fakeFetch((url) => (url.includes("/lines/json") ? Response.json({ type: "Feature" }) : undefined));
    await expect(fetchTransitNetwork(garbled)).rejects.toThrow(MApiError);
  });
});
