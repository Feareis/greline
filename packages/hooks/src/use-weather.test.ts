import type { GrelineApiClient } from "@greline/services";
import { describe, expect, it, vi } from "vitest";
import { weatherQueryOptions } from "./use-weather";

describe("weatherQueryOptions", () => {
  it("asks the injected client and refreshes every 15 min while visible", async () => {
    const getWeather = vi.fn(async () => ({ temperature: 9.6, apparentTemperature: 8.9, weatherCode: 3, isDay: false, windSpeed: 1.1, sunrise: "07:22", sunset: "17:18" }));
    const client = { getWeather } as unknown as GrelineApiClient;
    const options = weatherQueryOptions(client);
    const signal = new AbortController().signal;
    await (options.queryFn as (context: { signal: AbortSignal }) => unknown)({ signal });
    expect(getWeather).toHaveBeenCalledWith(signal);
    expect(options.refetchInterval).toBe(900_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });
});
