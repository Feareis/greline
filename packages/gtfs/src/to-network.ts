import { distanceToPolylineMeters } from "@greline/schematic";
import type { NetworkLine, Stop, TramNetwork } from "@greline/types";
import type { MLineShapes, MRoute, MTimesheet } from "@greline/validation";

/**
 * A timesheet stop farther than this from the official line shape belongs to an occasional
 * variant (depot run, night extension). Measured on real data: regular stops sit within ~100 m
 * of their shape, variant stops 450 m to 5 km away.
 */
const MAX_STOP_DISTANCE_TO_SHAPE_M = 150;

export interface MTramNetworkInput {
  routes: readonly MRoute[];
  shapes: MLineShapes;
  /** Timesheet of each route, keyed by route id ("SEM:A"). */
  timesheets: ReadonlyMap<string, MTimesheet>;
}

type TimesheetStop = MTimesheet[string]["arrets"][number];

/** Shape ids use an underscore where route ids use a colon: "SEM:A" -> "SEM_A". */
export const shapeIdOf = (routeId: string): string => routeId.replace(":", "_");

function longestDirection(timesheet: MTimesheet): TimesheetStop[] {
  return Object.values(timesheet).reduce<TimesheetStop[]>(
    (longest, direction) => (direction.arrets.length > longest.length ? direction.arrets : longest),
    [],
  );
}

function stopsOnShape(route: MRoute, input: MTramNetworkInput): TimesheetStop[] {
  const shape = input.shapes.features.find((f) => f.properties.id === shapeIdOf(route.id));
  if (!shape) throw new Error(`M API: no shape for route ${route.id}`);
  const timesheet = input.timesheets.get(route.id);
  if (!timesheet) throw new Error(`M API: no timesheet for route ${route.id}`);
  const parts = shape.geometry.coordinates;
  return longestDirection(timesheet).filter((stop) => {
    const distance = Math.min(...parts.map((part) => distanceToPolylineMeters([stop.lon, stop.lat], part)));
    return distance <= MAX_STOP_DISTANCE_TO_SHAPE_M;
  });
}

function toLine(route: MRoute, stops: readonly TimesheetStop[]): NetworkLine {
  const codes = stops.map((s) => s.parentStation.code);
  return {
    id: route.id,
    shortName: route.shortName,
    longName: route.longName,
    mode: "tram",
    color: route.color.toUpperCase(),
    textColor: route.textColor.toUpperCase(),
    // Two platforms of one station can follow each other in a timesheet: keep the station once.
    stopIds: codes.filter((code, i) => code !== codes[i - 1]),
  };
}

/** Converts validated M API responses into our tram network (lines in A, B, C... order). */
export function toTramNetwork(input: MTramNetworkInput): TramNetwork {
  const stops = new Map<string, Stop>();
  const routes = [...input.routes].sort((a, b) => a.shortName.localeCompare(b.shortName));
  const lines = routes.map((route) => {
    const lineStops = stopsOnShape(route, input);
    for (const { parentStation: station } of lineStops) {
      stops.set(station.code, { id: station.code, name: station.name, city: station.city, lat: station.lat, lon: station.lon });
    }
    return toLine(route, lineStops);
  });
  return { lines, stops: [...stops.values()] };
}
