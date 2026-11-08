import type { GrelineApiClient } from "@greline/services";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

/** The car parks count their free spaces about every minute; our API caches them as long. */
const PARK_AND_RIDES_REFRESH_MS = 60_000;

export function parkAndRidesQueryOptions(client: GrelineApiClient) {
  return queryOptions({
    queryKey: ["park-and-rides"] as const,
    queryFn: ({ signal }) => client.getParkAndRides(signal),
    staleTime: PARK_AND_RIDES_REFRESH_MS,
    refetchInterval: PARK_AND_RIDES_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: retryServerErrors,
  });
}

/**
 * P+R car parks and their free spaces, refreshed every minute while the page is visible.
 * `enabled: false` asks nothing, until a list or the map needs them.
 */
export function useParkAndRides(enabled = true) {
  return useQuery({ ...parkAndRidesQueryOptions(useApiConfig().client), enabled });
}
