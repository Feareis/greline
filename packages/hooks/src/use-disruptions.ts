import type { GrelineApiClient } from "@greline/services";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

/** Our API caches the M events feed 2 min. */
export const DISRUPTIONS_REFRESH_MS = 120_000;

export function disruptionsQueryOptions(client: GrelineApiClient) {
  return queryOptions({
    queryKey: ["disruptions"] as const,
    queryFn: ({ signal }) => client.getDisruptions(signal),
    staleTime: DISRUPTIONS_REFRESH_MS,
    refetchInterval: DISRUPTIONS_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: retryServerErrors,
  });
}

/** Ongoing and upcoming official disruptions, refreshed every 2 min while the page is visible. */
export function useDisruptions() {
  return useQuery(disruptionsQueryOptions(useApiConfig().client));
}
