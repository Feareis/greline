import { distanceToPolylineMeters } from "@greline/services";
import { type LonLat, NETWORK_IDS, type NetworkId, type NetworkLine, type Stop, type TransitNetwork } from "@greline/types";
import type { MLineShapes, MRoute, MTimesheet } from "@greline/validation";
import { simplifyPolyline } from "./shapes";

/** M API networks ("reseaux") making up each of our networks. */
export const M_NETWORK_TYPES: Record<NetworkId, readonly string[]> = {
  tram: ["TRAM"],
  chrono: ["CHRONO", "CHRONO_PERI"],
  proximo: ["PROXIMO"],
};

/** Our network of a M network type ("CHRONO_PERI" -> "chrono"), if we show it. */
export function networkOfRouteType(type: string): NetworkId | undefined {
  return NETWORK_IDS.find((id) => M_NETWORK_TYPES[id].includes(type));
}

/** Our GTFS feed is SEM's: lines run by the other operators of the M network are left out. */
const SHOWN_OPERATOR_PREFIX = "SEM:";

export const isShownRoute = (route: MRoute): boolean =>
  route.id.startsWith(SHOWN_OPERATOR_PREFIX) && networkOfRouteType(route.type) !== undefined;

/** Shape points closer than this to a straight line are dropped: invisible on a map. */
const SHAPE_TOLERANCE_M = 2;

/**
 * A timesheet stop farther than this from the official line shape belongs to an occasional
 * variant (depot run, night extension). Measured on real data: regular stops sit within ~100 m
 * of their shape, variant stops 450 m to 5 km away.
 */
const MAX_STOP_DISTANCE_TO_SHAPE_M = 150;

export interface MTransitNetworkInput {
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

function shapeOf(route: MRoute, input: MTransitNetworkInput): LonLat[][] {
  const shape = input.shapes.features.find((f) => f.properties.id === shapeIdOf(route.id));
  if (!shape) throw new Error(`M API: no shape for route ${route.id}`);
  return shape.geometry.coordinates.map((part) => simplifyPolyline(part, SHAPE_TOLERANCE_M));
}

function stopsOnShape(route: MRoute, parts: readonly LonLat[][], input: MTransitNetworkInput): TimesheetStop[] {
  const timesheet = input.timesheets.get(route.id);
  if (!timesheet) throw new Error(`M API: no timesheet for route ${route.id}`);
  return longestDirection(timesheet).filter((stop) => {
    const distance = Math.min(...parts.map((part) => distanceToPolylineMeters([stop.lon, stop.lat], part)));
    return distance <= MAX_STOP_DISTANCE_TO_SHAPE_M;
  });
}

function toLine(route: MRoute, network: NetworkId, stops: readonly TimesheetStop[], shape: LonLat[][]): NetworkLine {
  const codes = stops.map((s) => s.parentStation.code);
  return {
    id: route.id,
    shortName: route.shortName,
    longName: route.longName,
    mode: network === "tram" ? "tram" : "bus",
    network,
    color: route.color.toUpperCase(),
    textColor: route.textColor.toUpperCase(),
    // Two platforms of one station can follow each other in a timesheet: keep the station once.
    stopIds: codes.filter((code, i) => code !== codes[i - 1]),
    shape,
  };
}

/** Every platform (stop point) of each station, across all lines and both directions. */
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

/** The platform lying closest to the given tracks: a real stop point, on the rails or road. */
function platformOnTracks(platforms: Iterable<LonLat>, tracks: readonly LonLat[][]): LonLat {
  let best: { platform: LonLat; meters: number } | null = null;
  for (const platform of platforms) {
    const meters = Math.min(...tracks.map((track) => distanceToPolylineMeters(platform, track)));
    if (!best || meters < best.meters) best = { platform, meters };
  }
  if (!best) throw new Error("M API: station without any platform");
  return best.platform;
}

interface RankedRoute {
  route: MRoute;
  network: NetworkId;
}

const byNetworkThenName = (a: RankedRoute, b: RankedRoute): number =>
  NETWORK_IDS.indexOf(a.network) - NETWORK_IDS.indexOf(b.network) ||
  a.route.shortName.localeCompare(b.route.shortName, "fr", { numeric: true });

/**
 * Converts validated M API responses into our network: trams (A, B, C...), then Chrono (C1, C2...
 * C10) and Proximo lines. Routes we do not show are ignored.
 *
 * Station positions: the M cluster point averages every stop sharing the name, bus stops
 * included (up to ~80 m off the tracks), and averaging the tram platforms instead fails where
 * lines cross on different streets. The platform closest to the station's tracks is always on
 * the rails, crossings included; tram tracks win over bus roads at shared stations.
 */
export function toTransitNetwork(input: MTransitNetworkInput): TransitNetwork {
  const platforms = platformsByStation(input.timesheets);
  const stations = new Map<string, { name: string; city: string }>();
  const routes = input.routes
    .filter(isShownRoute)
    .map((route): RankedRoute => ({ route, network: networkOfRouteType(route.type)! }))
    .sort(byNetworkThenName);
  const lines = routes.map(({ route, network }) => {
    const shape = shapeOf(route, input);
    const lineStops = stopsOnShape(route, shape, input);
    for (const { parentStation } of lineStops) stations.set(parentStation.code, parentStation);
    return toLine(route, network, lineStops, shape);
  });
  const stops: Stop[] = [...stations].map(([code, { name, city }]) => {
    const serving = lines.filter((line) => line.stopIds.includes(code));
    const tramServing = serving.filter((line) => line.mode === "tram");
    const tracks = (tramServing.length > 0 ? tramServing : serving).flatMap((line) => line.shape);
    const [lon, lat] = platformOnTracks(platforms.get(code)?.values() ?? [], tracks);
    return { id: code, name, city, lat, lon };
  });
  return { lines, stops };
}
