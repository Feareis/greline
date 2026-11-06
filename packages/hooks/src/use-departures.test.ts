import { GrelineApiError, type GrelineApiClient } from "@greline/services";
import { skipToken } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { departuresQueryOptions } from "./use-departures";

const client: GrelineApiClient = {
  getDepartures: vi.fn(async () => []),
  getTramSchedule: vi.fn(async () => ({ serviceDate: "2026-11-06", patterns: [], trips: [] })),
  getTripDelays: vi.fn(async () => ({})),
};

describe("departuresQueryOptions", () => {
  it("refreshes every 15 s by default, and only while the page is visible", () => {
    const options = departuresQueryOptions("SEM:GENGAR", { client });
    expect(options.refetchInterval).toBe(15_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });

  it("uses the injected refresh interval", () => {
    expect(departuresQueryOptions("SEM:GENGAR", { client, refetchIntervalMs: 30_000 }).refetchInterval).toBe(30_000);
  });

  it("stays idle until a station is selected", () => {
    expect(departuresQueryOptions(null, { client }).queryFn).toBe(skipToken);
    expect(departuresQueryOptions("SEM:GENGAR", { client }).queryFn).not.toBe(skipToken);
  });

  it("keys the cache by station", () => {
    expect(departuresQueryOptions("SEM:GENGAR", { client }).queryKey).toEqual(["departures", "SEM:GENGAR"]);
  });

  it("asks the injected client, forwarding the abort signal", async () => {
    const signal = new AbortController().signal;
    const queryFn = departuresQueryOptions("SEM:GENGAR", { client }).queryFn as (context: { signal: AbortSignal }) => unknown;
    await queryFn({ signal });
    expect(client.getDepartures).toHaveBeenCalledWith("SEM:GENGAR", signal);
  });

  it("retries server errors but not client errors such as an unknown station", () => {
    const retry = departuresQueryOptions("SEM:GENGAR", { client }).retry as (count: number, error: Error) => boolean;
    expect(retry(0, new GrelineApiError(404, "unknown_stop"))).toBe(false);
    expect(retry(0, new GrelineApiError(502, "upstream_unavailable"))).toBe(true);
    expect(retry(2, new GrelineApiError(502, "upstream_unavailable"))).toBe(false);
  });
});
