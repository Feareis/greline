import type { Stop } from "@greline/types";

export interface GeoPoint {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle (haversine) distance in meters. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface NearbyStop {
  stop: Stop;
  distanceMeters: number;
}

/** The `count` stops closest to `origin`, closest first. A full sort is fine for ~100 stops. */
export function nearestStops(origin: GeoPoint, stops: readonly Stop[], count: number): NearbyStop[] {
  return stops
    .map((stop) => ({ stop, distanceMeters: distanceMeters(origin, stop) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, count);
}
