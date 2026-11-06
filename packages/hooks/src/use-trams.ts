import type { GrelineApiClient } from "@greline/services";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { retryServerErrors, useApiConfig } from "./api-config";

export const DEFAULT_DELAYS_REFRESH_MS = 30_000;
/** The schedule only changes with the service day: an hourly check catches midnight. */
const SCHEDULE_REFRESH_MS = 3_600_000;

type Delays = Record<string, number>;

export function tramScheduleQueryOptions(client: GrelineApiClient) {
  return queryOptions({
    queryKey: ["tram-schedule"] as const,
    queryFn: ({ signal }) => client.getTramSchedule(signal),
    staleTime: SCHEDULE_REFRESH_MS,
    refetchInterval: SCHEDULE_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: retryServerErrors,
  });
}

/**
 * A tram is only measured while it approaches a probe station, so the last known delay is kept
 * once it moves past. Bounded by the trips of one day (~1 600 entries).
 */
export function mergeDelays(previous: Delays | undefined, next: Delays): Delays {
  return { ...previous, ...next };
}

export function tripDelaysQueryOptions(client: GrelineApiClient, refetchIntervalMs = DEFAULT_DELAYS_REFRESH_MS) {
  return queryOptions({
    queryKey: ["trip-delays"] as const,
    queryFn: ({ signal }) => client.getTripDelays(signal),
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: false,
    staleTime: refetchIntervalMs,
    retry: retryServerErrors,
    structuralSharing: (previous, next) => mergeDelays(previous as Delays | undefined, next as Delays),
  });
}

/** Today's tram schedule (every trip, with its departure times). */
export function useTramSchedule() {
  return useQuery(tramScheduleQueryOptions(useApiConfig().client));
}

/** Realtime delays of running trams, refreshed every 30 s while the page is visible. */
export function useTripDelays() {
  const { client, delaysRefreshMs } = useApiConfig();
  return useQuery(tripDelaysQueryOptions(client, delaysRefreshMs));
}
