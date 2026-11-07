import { fetchItineraries, type Place } from "@greline/gtfs";
import type { Itinerary } from "@greline/types";
import { cacheLife } from "next/cache";

export const ITINERARIES_REFRESH_S = 60;

/**
 * Itineraries leaving now, cached per pair of places (the arguments are the cache key): the M
 * planner is asked at most once a minute per trip. Short expiry: an old answer may list a
 * departure that is already gone.
 */
export async function getItineraries(from: Place, to: Place): Promise<Itinerary[]> {
  "use cache";
  cacheLife({ stale: ITINERARIES_REFRESH_S, revalidate: ITINERARIES_REFRESH_S, expire: 2 * ITINERARIES_REFRESH_S });
  return fetchItineraries(from, to);
}
