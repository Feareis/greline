import type { GrelineApiClient } from "@greline/services";
import { skipToken } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { itinerariesQueryOptions } from "./use-itineraries";

describe("itinerariesQueryOptions", () => {
  const getItineraries = vi.fn(async () => []);
  const client = { getItineraries } as unknown as GrelineApiClient;

  it("stays idle until both ends are known", () => {
    expect(itinerariesQueryOptions(client, "SEM:GENGAR", null).queryFn).toBe(skipToken);
    expect(itinerariesQueryOptions(client, null, "SEM:GENGAR").queryFn).toBe(skipToken);
  });

  it("keys the cache by trip and refreshes every 30 s while visible", () => {
    const options = itinerariesQueryOptions(client, "SEM:GENGAR", "SEM:GENCHAVANT");
    expect(options.queryKey).toEqual(["itineraries", "SEM:GENGAR", "SEM:GENCHAVANT"]);
    expect(options.refetchInterval).toBe(30_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });

  it("asks the injected client, forwarding the abort signal", async () => {
    const signal = new AbortController().signal;
    const queryFn = itinerariesQueryOptions(client, "SEM:GENGAR", "SEM:GENCHAVANT").queryFn as (context: { signal: AbortSignal }) => unknown;
    await queryFn({ signal });
    expect(getItineraries).toHaveBeenCalledWith("SEM:GENGAR", "SEM:GENCHAVANT", signal);
  });
});
