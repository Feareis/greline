import type { GrelineApiClient } from "@greline/services";
import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

export const DEFAULT_DEPARTURES_REFRESH_MS = 15_000;

interface DeparturesOptions {
  client: GrelineApiClient;
  refetchIntervalMs?: number;
}

/** TanStack Query options for a station's departures (pure, so it is testable without React). */
export function departuresQueryOptions(
  stopId: string | null,
  { client, refetchIntervalMs = DEFAULT_DEPARTURES_REFRESH_MS }: DeparturesOptions,
) {
  return queryOptions({
    queryKey: ["departures", stopId] as const,
    queryFn: stopId === null ? skipToken : ({ signal }) => client.getDepartures(stopId, signal),
    refetchInterval: refetchIntervalMs,
    // Interval refetches pause while the page is hidden. TanStack's focusManager listens to
    // `visibilitychange` on the web; the mobile app must bind it to React Native's AppState.
    refetchIntervalInBackground: false,
    staleTime: refetchIntervalMs,
    retry: retryServerErrors,
  });
}

/** Live departures of a station (null = nothing selected, no request). */
export function useDepartures(stopId: string | null) {
  const { client, departuresRefreshMs } = useApiConfig();
  return useQuery(departuresQueryOptions(stopId, { client, refetchIntervalMs: departuresRefreshMs }));
}
