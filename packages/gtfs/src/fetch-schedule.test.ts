import { describe, expect, it, vi } from "vitest";
import tiny from "./__fixtures__/tiny-zip.json";
import { fetchSchedules } from "./fetch-schedule";
import { MApiError } from "./fetch-network";

// A real zip that is not a GTFS feed (routes.txt + big.txt only).
const notGtfs = Uint8Array.from(atob(tiny.base64), (char) => char.charCodeAt(0));

describe("fetchSchedules", () => {
  it("downloads the GTFS archive with the origin header required by the M API", async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(notGtfs));
    // The archive is not a GTFS feed, so this rejects: only the request is checked here.
    await expect(fetchSchedules("2026-11-06", fetchSpy)).rejects.toThrow(MApiError);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://data.mobilites-m.fr/api/gtfs/SEM");
    expect(new Headers(init?.headers).get("origin")).toBe("greline");
  });

  it("rejects with MApiError on an HTTP error", async () => {
    const failing = vi.fn(async () => new Response("down", { status: 503 }));
    await expect(fetchSchedules("2026-11-06", failing)).rejects.toThrow(MApiError);
  });

  it("rejects with MApiError when the archive is not a usable GTFS feed", async () => {
    const wrongArchive = vi.fn(async () => new Response(notGtfs));
    await expect(fetchSchedules("2026-11-06", wrongArchive)).rejects.toThrow(/GTFS/);
  });
});
