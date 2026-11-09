import { findTrip, fleetSummary, type GrelineApiClient, vehiclePositions } from "@greline/services";
import { NETWORK_IDS, type NetworkId, type TransitSchedule, type TripReadings } from "@greline/types";
import { queryOptions, type UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { retryServerErrors, useApiConfig } from "./api-config";
import { useNow } from "./use-now";

export const DEFAULT_DELAYS_REFRESH_MS = 15_000;
/** The schedule only changes with the service day: an hourly check catches midnight. */
export const SCHEDULE_REFRESH_MS = 3_600_000;

export function scheduleQueryOptions(client: GrelineApiClient, network: NetworkId) {
  return queryOptions({
    queryKey: ["schedule", network] as const,
    queryFn: ({ signal }) => client.getSchedule(network, signal),
    staleTime: SCHEDULE_REFRESH_MS,
    refetchInterval: SCHEDULE_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: retryServerErrors,
  });
}

/**
 * A vehicle is only measured while it approaches a probe station, so its last known delay and
 * occupancy are kept once it moves past. Bounded by the trips of one day (~5 000 entries).
 */
export function mergeTripReadings(previous: TripReadings | undefined, next: TripReadings): TripReadings {
  return {
    delays: { ...previous?.delays, ...next.delays },
    occupancy: { ...previous?.occupancy, ...next.occupancy },
  };
}

export function tripDelaysQueryOptions(client: GrelineApiClient, refetchIntervalMs = DEFAULT_DELAYS_REFRESH_MS) {
  return queryOptions({
    queryKey: ["trip-delays"] as const,
    queryFn: ({ signal }) => client.getTripDelays(signal),
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: false,
    staleTime: refetchIntervalMs,
    retry: retryServerErrors,
    structuralSharing: (previous, next) => mergeTripReadings(previous as TripReadings | undefined, next as TripReadings),
  });
}

export interface Schedules {
  /** Loaded schedules, in the order of the requested networks. */
  schedules: TransitSchedule[];
  isPending: boolean;
  isError: boolean;
}

// Module-level so TanStack Query keeps the combined result stable between renders.
function combineSchedules(results: UseQueryResult<TransitSchedule>[]): Schedules {
  return {
    schedules: results.flatMap((result) => (result.data ? [result.data] : [])),
    isPending: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
  };
}

/** Today's schedules of the given networks: each is loaded once, when its network is shown. */
export function useSchedules(networks: readonly NetworkId[]): Schedules {
  const { client } = useApiConfig();
  return useQueries({ queries: networks.map((network) => scheduleQueryOptions(client, network)), combine: combineSchedules });
}

const NO_NETWORKS: readonly NetworkId[] = [];

/**
 * The trip behind a vehicle key and its schedule, null while unknown. Every network is searched
 * (a shared link may name a bus of a network the filter hides); nothing is loaded without a key.
 */
export function useVehicleTrip(key: string | null) {
  const { schedules, isPending, isError } = useSchedules(key ? NETWORK_IDS : NO_NETWORKS);
  const found = useMemo(() => (key ? findTrip(schedules, key) : null), [schedules, key]);
  return { found, isPending: key !== null && isPending, isError };
}

/** Realtime delays and occupancy of running vehicles, refreshed every 15 s while the page is visible. */
export function useTripDelays() {
  const { client, delaysRefreshMs } = useApiConfig();
  return useQuery(tripDelaysQueryOptions(client, delaysRefreshMs));
}

/** Running vehicles of the given networks per line, the late ones and the traffic level, every few seconds. */
export function useFleetSummary(networks: readonly NetworkId[], refreshMs = 5_000) {
  const { schedules, isPending, isError } = useSchedules(networks);
  const delays = useTripDelays();
  const now = useNow(refreshMs);
  const summary = useMemo(() => {
    if (isPending) return undefined;
    const seconds = now.getTime() / 1000;
    return fleetSummary(schedules.flatMap((schedule) => vehiclePositions(schedule, delays.data?.delays ?? {}, seconds)));
  }, [schedules, isPending, delays.data, now]);
  return {
    summary,
    isLoading: isPending,
    isError,
    /** Without realtime delays every tram looks on time: late counts are then meaningless. */
    delaysAvailable: delays.data !== undefined,
  };
}
