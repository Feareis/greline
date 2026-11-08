import type { GrelineApiClient } from "@greline/services";
import { describe, expect, it, vi } from "vitest";
import { parkAndRidesQueryOptions } from "./use-park-and-rides";

describe("parkAndRidesQueryOptions", () => {
  it("asks the injected client and refreshes every minute while visible", async () => {
    const getParkAndRides = vi.fn(async () => []);
    const options = parkAndRidesQueryOptions({ getParkAndRides } as unknown as GrelineApiClient);
    const signal = new AbortController().signal;
    await (options.queryFn as (context: { signal: AbortSignal }) => unknown)({ signal });
    expect(getParkAndRides).toHaveBeenCalledWith(signal);
    expect(options.refetchInterval).toBe(60_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });
});
