import { fetchStopDepartures } from "@greline/gtfs";
import type { Departure } from "@greline/types";
import { cacheLife } from "next/cache";

export const STOP_DEPARTURES_REFRESH_S = 15;

/**
 * Next departures at a station, cached per station (the arguments are the cache key): however
 * many visitors watch a station, the M API is asked at most once per 15 s window, and the
 * refresh happens in the background while the previous answer is served.
 */
export async function getStopDepartures(stopId: string, tramLineIds: readonly string[]): Promise<Departure[]> {
  "use cache";
  cacheLife({ stale: STOP_DEPARTURES_REFRESH_S, revalidate: STOP_DEPARTURES_REFRESH_S, expire: 4 * STOP_DEPARTURES_REFRESH_S });
  return fetchStopDepartures(stopId, new Set(tramLineIds));
}
