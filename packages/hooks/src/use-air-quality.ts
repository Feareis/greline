import type { GrelineApiClient } from "@greline/services";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

/** The index is computed hourly; our API caches it 30 min. */
const AIR_QUALITY_REFRESH_MS = 30 * 60_000;

export function airQualityQueryOptions(client: GrelineApiClient) {
  return queryOptions({
    queryKey: ["air-quality"] as const,
    queryFn: ({ signal }) => client.getAirQuality(signal),
    staleTime: AIR_QUALITY_REFRESH_MS,
    refetchInterval: AIR_QUALITY_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: retryServerErrors,
  });
}

/** Current air quality in Grenoble, refreshed every 30 min while the page is visible. */
export function useAirQuality() {
  return useQuery(airQualityQueryOptions(useApiConfig().client));
}
