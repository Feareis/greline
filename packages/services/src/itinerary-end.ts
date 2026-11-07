import type { ItineraryEnd, Stop } from "@greline/types";
import { roundToHundredMeters } from "@greline/validation";
import { type GeoPoint, nearestStops } from "./geo";

/** A position farther than this from every stop is not served: no itinerary is asked for it. */
export const SERVICE_AREA_RADIUS_M = 2_000;

/** The `from` / `to` value of our itineraries API for one end of the search. */
export function itineraryEndParam(end: ItineraryEnd): string {
  if (end.kind === "stop") return end.stopId;
  return `${roundToHundredMeters(end.lat)},${roundToHundredMeters(end.lon)}`;
}

/** True when the position lies within walking distance of a stop of the network. */
export function isWithinServiceArea(point: GeoPoint, stops: readonly Stop[]): boolean {
  const [nearest] = nearestStops(point, stops, 1);
  return nearest !== undefined && nearest.distanceMeters <= SERVICE_AREA_RADIUS_M;
}

/** Where the planner should start or end: the stop's position, or the user's if near the network. */
export function resolveItineraryEnd(end: ItineraryEnd, stops: readonly Stop[]): GeoPoint | "unknown_stop" | "outside_service_area" {
  if (end.kind === "stop") {
    const stop = stops.find((s) => s.id === end.stopId);
    return stop ? { lat: stop.lat, lon: stop.lon } : "unknown_stop";
  }
  const point = { lat: end.lat, lon: end.lon };
  return isWithinServiceArea(point, stops) ? point : "outside_service_area";
}
