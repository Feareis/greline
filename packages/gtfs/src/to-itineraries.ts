import type { Itinerary, ItineraryRide } from "@greline/types";
import type { MPlan, MPlanLeg } from "@greline/validation";

/** Shown for a line the planner gives no color: a neutral grey, readable in both themes. */
const NO_COLOR = "777777";
const NO_TEXT_COLOR = "FFFFFF";

/** The planner names stops "City, Name"; the site shows the name alone, as on the map. */
const withoutCity = (name: string): string => name.slice(name.indexOf(", ") + 1).trim();

const isoOf = (unixMs: number): string => new Date(unixMs).toISOString();

function toRide(leg: MPlanLeg): ItineraryRide {
  return {
    shortName: leg.routeShortName ?? leg.routeLongName ?? leg.mode,
    color: leg.routeColor ?? NO_COLOR,
    textColor: leg.routeTextColor ?? NO_TEXT_COLOR,
    headsign: leg.headsign ?? "",
    from: withoutCity(leg.from.name),
    to: withoutCity(leg.to.name),
    departureTime: isoOf(leg.startTime),
    arrivalTime: isoOf(leg.endTime),
    realtime: leg.realTime,
  };
}

/**
 * The planner's itineraries, in its order; walks are summed up, rides kept. The planner always
 * lists walking all the way, often first, even when it takes an hour: it is kept only when no
 * ride arrives sooner.
 */
export function toItineraries(plan: MPlan): Itinerary[] {
  const itineraries = plan.plan.itineraries.map((itinerary) => ({
    departureTime: isoOf(itinerary.startTime),
    arrivalTime: isoOf(itinerary.endTime),
    walkSeconds: itinerary.walkTime,
    rides: itinerary.legs.filter((leg) => leg.transitLeg).map(toRide),
  }));
  // Infinity when nothing rides: then every walk is kept.
  const firstRideArrival = Math.min(...itineraries.filter((it) => it.rides.length > 0).map((it) => Date.parse(it.arrivalTime)));
  return itineraries.filter((it) => it.rides.length > 0 || Date.parse(it.arrivalTime) <= firstRideArrival);
}
