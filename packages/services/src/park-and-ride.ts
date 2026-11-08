import type { ParkAndRide } from "@greline/types";
import { distanceMeters, type GeoPoint } from "./geo";

/** How full a P+R is, for its color on the map: "unknown" without a live count. */
export type ParkAndRideLevel = "available" | "almostFull" | "full" | "unknown";

/** Below this many free spaces, or this share of the car park, finding one gets uncertain. */
const ALMOST_FULL_COUNT = 10;
const ALMOST_FULL_SHARE = 0.1;

export function parkAndRideLevel({ free, capacity }: Pick<ParkAndRide, "free" | "capacity">): ParkAndRideLevel {
  if (free === null) return "unknown";
  if (free === 0) return "full";
  if (free < Math.max(ALMOST_FULL_COUNT, capacity * ALMOST_FULL_SHARE)) return "almostFull";
  return "available";
}

/**
 * Farthest walk from a P+R to a stop of the network: about 6 minutes. Beyond, the car park serves
 * another network (TransIsere stations: Voiron, Moirans...) and has no place on our map.
 */
export const PARK_AND_RIDE_MAX_WALK_M = 500;

/** The P+R a short walk from a stop of the network (any of its lines, shown or not). */
export function parkAndRidesNearStops(
  parkAndRides: readonly ParkAndRide[],
  stops: readonly GeoPoint[],
  maxMeters = PARK_AND_RIDE_MAX_WALK_M,
): ParkAndRide[] {
  return parkAndRides.filter((parkAndRide) => stops.some((stop) => distanceMeters(parkAndRide, stop) <= maxMeters));
}
