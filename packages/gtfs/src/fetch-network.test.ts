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

  it("rejects with MApiError on an HTTP error", async () => {
    const failing = fakeFetch((url) => (url.includes("/index/routes") ? new Response("down", { status: 503 }) : undefined));
    await expect(fetchTransitNetwork(failing)).rejects.toThrow(MApiError);
  });

  it("rejects with MApiError on an unexpected payload", async () => {
    const garbled = fakeFetch((url) => (url.includes("/lines/json") ? Response.json({ type: "Feature" }) : undefined));
    await expect(fetchTransitNetwork(garbled)).rejects.toThrow(MApiError);
  });
});
