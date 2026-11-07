import type { GrelineApiClient } from "@greline/services";
import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

/** Itineraries leave "now": refreshed every minute, as often as our API asks the M planner. */
const ITINERARIES_REFRESH_MS = 60_000;

export function itinerariesQueryOptions(client: GrelineApiClient, from: string | null, to: string | null) {
  return queryOptions({
    queryKey: ["itineraries", from, to] as const,
    queryFn: from === null || to === null ? skipToken : ({ signal }) => client.getItineraries(from, to, signal),
    staleTime: ITINERARIES_REFRESH_MS,
    refetchInterval: ITINERARIES_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: retryServerErrors,
  });
}

/** Best itineraries leaving now between two stops (null = an end is missing, no request). */
export function useItineraries(from: string | null, to: string | null) {
  return useQuery(itinerariesQueryOptions(useApiConfig().client, from, to));
}
