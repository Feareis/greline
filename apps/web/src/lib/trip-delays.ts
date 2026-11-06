import { delayProbeStations, fetchTripDelays, type TripDelays } from "@greline/gtfs";
import { cacheLife } from "next/cache";
import { getTransitNetwork } from "@/lib/transit-network";

const REFRESH_S = 30;

/**
 * Realtime tram delays, cached 30 s: one batch of ~12 M API requests per window and per server
 * instance, whatever the number of visitors.
 */
export async function getTripDelays(): Promise<TripDelays> {
  "use cache";
  cacheLife({ stale: REFRESH_S, revalidate: REFRESH_S, expire: 4 * REFRESH_S });
  const network = await getTransitNetwork();
  const result = await fetchTripDelays(delayProbeStations(network.lines), new Set(network.lines.map((line) => line.id)));
  if (result.failedStations > 0) console.warn(`Trip delays: ${result.failedStations} probe station(s) failed`);
  return result;
}
