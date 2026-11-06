import type { NetworkLine, SchematicMap, SchematicPoint, TramNetwork } from "@greline/types";
import { createLocalProjection } from "./geo";
import { SCHEMATIC_GRID } from "./grid";
import { compressRadially, snapStationsToGrid } from "./layout";
import { buildLinePaths } from "./routing";

export interface SchematicMapOptions {
  /** Size, in map units, of the largest side of the network before padding. */
  size?: number;
  /** Radial compression exponent (1 = geographic, lower = roomier center). */
  compression?: number;
  /** Distance between parallel lines sharing an edge, in map units. */
  lineSpacing?: number;
  /** Empty margin around the network, in map units (a multiple of the grid keeps nodes aligned). */
  padding?: number;
}

const DEFAULT_OPTIONS: Required<SchematicMapOptions> = {
  size: 1000,
  compression: 0.7,
  lineSpacing: 6,
  padding: 48,
};

/** Lines serving each station, in line order. Two or more lines means a transfer. */
export function groupLinesByStation(lines: readonly NetworkLine[]): Map<string, string[]> {
  const byStation = new Map<string, string[]>();
  for (const line of lines) {
    for (const stopId of line.stopIds) {
      const lineIds = byStation.get(stopId) ?? [];
      if (!lineIds.includes(line.id)) lineIds.push(line.id);
      byStation.set(stopId, lineIds);
    }
  }
  return byStation;
}

function projectStations(network: TramNetwork, servedIds: ReadonlySet<string>): Map<string, SchematicPoint> {
  const served = network.stops.filter((s) => servedIds.has(s.id));
  const lons = served.map((s) => s.lon);
  const lats = served.map((s) => s.lat);
  const center = [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2] as const;
  const project = createLocalProjection(center);
  return new Map(served.map((s) => [s.id, project([s.lon, s.lat])]));
}

/** Scales points so the largest side measures `size`, with the top-left corner at (padding, padding). */
function fitToBox(points: ReadonlyMap<string, SchematicPoint>, size: number, padding: number): Map<string, SchematicPoint> {
  const xs = [...points.values()].map((p) => p.x);
  const ys = [...points.values()].map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const extent = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const scale = size / extent;
  const fitted = new Map<string, SchematicPoint>();
  for (const [id, p] of points) fitted.set(id, { x: padding + (p.x - minX) * scale, y: padding + (p.y - minY) * scale });
  return fitted;
}

/** Turns a geographic tram network into a renderer-independent schematic map. */
export function buildSchematicMap(network: TramNetwork, options: SchematicMapOptions = {}): SchematicMap {
  const { size, compression, lineSpacing, padding } = { ...DEFAULT_OPTIONS, ...options };
  const linesByStation = groupLinesByStation(network.lines);
  const projected = projectStations(network, new Set(linesByStation.keys()));
  const positions = snapStationsToGrid(fitToBox(compressRadially(projected, compression), size, padding), SCHEMATIC_GRID);
  const stations = [...positions].map(([stopId, position]) => ({
    stopId,
    position,
    lineIds: linesByStation.get(stopId)!,
  }));
  const paths = buildLinePaths(
    network.lines.map((l) => ({ id: l.id, stationIds: l.stopIds })),
    positions,
    lineSpacing,
  );
  const allX = stations.map((s) => s.position.x);
  const allY = stations.map((s) => s.position.y);
  return { width: Math.max(...allX) + padding, height: Math.max(...allY) + padding, stations, paths };
}
