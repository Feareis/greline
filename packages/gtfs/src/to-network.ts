import { distanceToPolylineMeters } from "@greline/services";
import type { LonLat, NetworkLine, Stop, TramNetwork } from "@greline/types";
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

function shapeOf(route: MRoute, input: MTramNetworkInput): LonLat[][] {
  const shape = input.shapes.features.find((f) => f.properties.id === shapeIdOf(route.id));
  if (!shape) throw new Error(`M API: no shape for route ${route.id}`);
  return shape.geometry.coordinates;
}

function stopsOnShape(route: MRoute, parts: readonly LonLat[][], input: MTramNetworkInput): TimesheetStop[] {
  const timesheet = input.timesheets.get(route.id);
  if (!timesheet) throw new Error(`M API: no timesheet for route ${route.id}`);
  return longestDirection(timesheet).filter((stop) => {
    const distance = Math.min(...parts.map((part) => distanceToPolylineMeters([stop.lon, stop.lat], part)));
    return distance <= MAX_STOP_DISTANCE_TO_SHAPE_M;
  });
}

function toLine(route: MRoute, stops: readonly TimesheetStop[], shape: LonLat[][]): NetworkLine {
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
    shape,
  };
}

/** Every tram platform (stop point) of each station, across all lines and both directions. */
function platformsByStation(timesheets: ReadonlyMap<string, MTimesheet>): Map<string, Map<string, LonLat>> {
  const byStation = new Map<string, Map<string, LonLat>>();
  for (const timesheet of timesheets.values()) {
    for (const direction of Object.values(timesheet)) {
      for (const stop of direction.arrets) {
        const platforms = byStation.get(stop.parentStation.code) ?? new Map<string, LonLat>();
        platforms.set(stop.stopId, [stop.lon, stop.lat]);
        byStation.set(stop.parentStation.code, platforms);
      }
    }
  }
  return byStation;
}

/** The platform lying closest to the given tracks: a real stop point, on the rails. */
function platformOnTracks(platforms: Iterable<LonLat>, tracks: readonly LonLat[][]): LonLat {
  let best: { platform: LonLat; meters: number } | null = null;
  for (const platform of platforms) {
    const meters = Math.min(...tracks.map((track) => distanceToPolylineMeters(platform, track)));
    if (!best || meters < best.meters) best = { platform, meters };
  }
  if (!best) throw new Error("M API: station without any tram platform");
  return best.platform;
}

/**
 * Converts validated M API responses into our tram network (lines in A, B, C... order).
 *
 * Station positions: the M cluster point averages every stop sharing the name, bus stops
 * included (up to ~80 m off the tracks), and averaging the tram platforms instead fails where
 * lines cross on different streets. The platform closest to the station's tracks is always on
 * the rails, crossings included.
 */
export function toTramNetwork(input: MTramNetworkInput): TramNetwork {
  const platforms = platformsByStation(input.timesheets);
  const stations = new Map<string, { name: string; city: string }>();
  const routes = [...input.routes].sort((a, b) => a.shortName.localeCompare(b.shortName));
  const lines = routes.map((route) => {
    const shape = shapeOf(route, input);
    const lineStops = stopsOnShape(route, shape, input);
    for (const { parentStation } of lineStops) stations.set(parentStation.code, parentStation);
    return toLine(route, lineStops, shape);
  });
  const stops: Stop[] = [...stations].map(([code, { name, city }]) => {
    const tracks = lines.filter((line) => line.stopIds.includes(code)).flatMap((line) => line.shape);
    const [lon, lat] = platformOnTracks(platforms.get(code)?.values() ?? [], tracks);
    return { id: code, name, city, lat, lon };
  });
  return { lines, stops };
}
