import type { SchematicPoint } from "@greline/types";

/** A GeoJSON position: longitude first, then latitude (degrees). */
export type Position = readonly [lon: number, lat: number];

const EARTH_RADIUS_M = 6_371_008.8;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Equirectangular projection centered on `origin`, returning meters with y pointing down (SVG).
 * At city scale (~15 km) the distortion stays below 0.1 %, which is far below what a schematic
 * map notices, so a full Mercator/UTM projection is not worth it.
 */
export function createLocalProjection(origin: Position): (position: Position) => SchematicPoint {
  const [originLon, originLat] = origin;
  const metersPerDegreeLat = EARTH_RADIUS_M * DEG_TO_RAD;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos(originLat * DEG_TO_RAD);
  return ([lon, lat]) => ({
    x: (lon - originLon) * metersPerDegreeLon,
    y: (originLat - lat) * metersPerDegreeLat,
  });
}

function distanceToSegment(point: SchematicPoint, start: SchematicPoint, end: SchematicPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

/** Shortest distance in meters from `point` to a polyline of GeoJSON positions. */
export function distanceToPolylineMeters(point: Position, polyline: readonly Position[]): number {
  const project = createLocalProjection(point);
  const projected = polyline.map(project);
  const origin = { x: 0, y: 0 };
  let nearest = Infinity;
  for (let i = 1; i < projected.length; i++) {
    nearest = Math.min(nearest, distanceToSegment(origin, projected[i - 1]!, projected[i]!));
  }
  return nearest;
}
