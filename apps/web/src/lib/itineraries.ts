import { fetchItineraries, type Place } from "@greline/gtfs";
import type { Itinerary } from "@greline/types";
import { cacheLife } from "next/cache";

const REFRESH_S = 60;

/**
 * Itineraries leaving now, cached per pair of places (the arguments are the cache key): the M
 * planner is asked at most once a minute per trip. Short expiry: an old answer may list a
 * departure that is already gone.
 */
export async function getItineraries(from: Place, to: Place): Promise<Itinerary[]> {
  "use cache";
  cacheLife({ stale: REFRESH_S, revalidate: REFRESH_S, expire: 2 * REFRESH_S });
  return fetchItineraries(from, to);
}
