import { fetchParkAndRides } from "@greline/gtfs";
import { parkAndRidesNearStops } from "@greline/services";
import type { ParkAndRide } from "@greline/types";
import { cacheLife } from "next/cache";
import { getTransitNetwork } from "./transit-network";

/** The car parks count their free spaces about every minute. */
export const PARK_AND_RIDES_REFRESH_S = 60;

/**
 * The P+R car parks near a stop of the network, with their live counts, from the M API at most
 * once a minute. The network itself comes from its own daily cache.
 */
export async function getParkAndRides(): Promise<ParkAndRide[]> {
  "use cache";
  cacheLife({ stale: PARK_AND_RIDES_REFRESH_S, revalidate: PARK_AND_RIDES_REFRESH_S, expire: 5 * PARK_AND_RIDES_REFRESH_S });
  const [parkAndRides, network] = await Promise.all([fetchParkAndRides(), getTransitNetwork()]);
  return parkAndRidesNearStops(parkAndRides, network.stops);
}
