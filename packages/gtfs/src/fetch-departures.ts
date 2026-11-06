import type { Departure } from "@greline/types";
import { mStopTimesSchema } from "@greline/validation";
import { type FetchLike, fetchFromMApi } from "./fetch-network";
import { toDepartures } from "./to-departures";

/** Next departures (realtime when known) of every pattern serving a station. */
export const stopTimesUrl = (stopId: string): string =>
  `https://data.mobilites-m.fr/api/routers/default/index/clusters/${encodeURIComponent(stopId)}/stoptimes`;

/**
 * Next departures of the given lines at a station, realtime when available.
 * `stopId` is the cluster code ("SEM:GENGAR"): the cluster id ("SEM:GAR") gets an empty 204.
 * The M API also answers 204 for an unknown code, so callers must check the id beforehand.
 */
export async function fetchStopDepartures(
  stopId: string,
  lineIds: ReadonlySet<string>,
  fetchFn: FetchLike = fetch,
): Promise<Departure[]> {
  const stopTimes = await fetchFromMApi(stopTimesUrl(stopId), mStopTimesSchema, fetchFn, []);
  return toDepartures(stopTimes, stopId, lineIds);
}
