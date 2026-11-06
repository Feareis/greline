import type { GrelineApiClient } from "@greline/services";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

/** Our API caches the weather 15 min, matching the model's update rate. */
const WEATHER_REFRESH_MS = 15 * 60_000;

export function weatherQueryOptions(client: GrelineApiClient) {
  return queryOptions({
    queryKey: ["weather"] as const,
    queryFn: ({ signal }) => client.getWeather(signal),
    staleTime: WEATHER_REFRESH_MS,
    refetchInterval: WEATHER_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: retryServerErrors,
  });
}

/** Current weather in Grenoble, refreshed every 15 min while the page is visible. */
export function useWeather() {
  return useQuery(weatherQueryOptions(useApiConfig().client));
}
