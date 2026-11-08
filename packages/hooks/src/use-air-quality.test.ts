import type { GrelineApiClient } from "@greline/services";
import { describe, expect, it, vi } from "vitest";
import { airQualityQueryOptions } from "./use-air-quality";

describe("airQualityQueryOptions", () => {
  it("asks the injected client and refreshes every 30 min while visible", async () => {
    const getAirQuality = vi.fn(async () => ({ index: 52 }));
    const options = airQualityQueryOptions({ getAirQuality } as unknown as GrelineApiClient);
    const signal = new AbortController().signal;
    await (options.queryFn as (context: { signal: AbortSignal }) => unknown)({ signal });
    expect(getAirQuality).toHaveBeenCalledWith(signal);
    expect(options.refetchInterval).toBe(1_800_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });
});
