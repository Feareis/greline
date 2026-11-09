import type { GrelineApiClient } from "@greline/services";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

/** Accessibility only changes with a new GTFS feed: once per visit is plenty. */
export const STOP_ACCESSIBILITY_STALE_MS = 6 * 3_600_000;

export function stopAccessibilityQueryOptions(client: GrelineApiClient) {
  return queryOptions({
    queryKey: ["stop-accessibility"] as const,
    queryFn: ({ signal }) => client.getStopAccessibility(signal),
    staleTime: STOP_ACCESSIBILITY_STALE_MS,
    retry: retryServerErrors,
  });
}

/** Wheelchair access of a stop, or undefined while loading, on error, or for a stop without data. */
export function useStopAccess(stopId: string) {
  const { data } = useQuery(stopAccessibilityQueryOptions(useApiConfig().client));
  return data?.[stopId];
}
