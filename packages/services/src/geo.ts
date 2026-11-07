import type { LonLat, Stop } from "@greline/types";

export interface GeoPoint {
  lat: number;
  lon: number;
}

/** A GeoJSON position: longitude first, then latitude (degrees). */
export type Position = Readonly<LonLat>;

/** A point in a local metric plane (meters, y pointing down). */
export interface PlanePoint {
  x: number;
  y: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const DEG_TO_RAD = Math.PI / 180;
const toRadians = (degrees: number): number => degrees * DEG_TO_RAD;

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

/**
 * Equirectangular projection centered on `origin`, returning meters with y pointing down.
 * At city scale (~15 km) the distortion stays below 0.1 %, so a full Mercator/UTM projection
 * is not worth it.
 */
export function createLocalProjection(origin: Position): (position: Position) => PlanePoint {
  const [originLon, originLat] = origin;
  const metersPerDegreeLat = EARTH_RADIUS_M * DEG_TO_RAD;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos(originLat * DEG_TO_RAD);
  return ([lon, lat]) => ({
    x: (lon - originLon) * metersPerDegreeLon,
    y: (originLat - lat) * metersPerDegreeLat,
  });
}

/** Where the perpendicular from `point` falls on segment [start, end]: 0 at start, 1 at end. */
export function segmentFraction(point: PlanePoint, start: PlanePoint, end: PlanePoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return 0;
  return Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
}

export function distanceToSegment(point: PlanePoint, start: PlanePoint, end: PlanePoint): number {
  const t = segmentFraction(point, start, end);
  return Math.hypot(point.x - (start.x + t * (end.x - start.x)), point.y - (start.y + t * (end.y - start.y)));
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

const asGeoPoint = ([lon, lat]: Position): GeoPoint => ({ lon, lat });

/** Distance in meters from the first point of the polyline to each of its points. */
export function cumulativeDistances(polyline: readonly Position[]): number[] {
  const distances = [0];
  for (let i = 1; i < polyline.length; i++) {
    distances.push(distances[i - 1]! + distanceMeters(asGeoPoint(polyline[i - 1]!), asGeoPoint(polyline[i]!)));
  }
  return distances;
}

/** Compass bearing from `a` to `b`, in degrees clockwise from north (0-360). */
export function bearingDegrees(a: Position, b: Position): number {
  const dx = (b[0] - a[0]) * Math.cos(toRadians((a[1] + b[1]) / 2));
  const dy = b[1] - a[1];
  return ((Math.atan2(dx, dy) / DEG_TO_RAD) % 360 + 360) % 360;
}

export interface TrackPoint {
  lon: number;
  lat: number;
  /** Direction of travel, degrees clockwise from north. */
  bearing: number;
}

/**
 * The point `distance` meters along a polyline (clamped to its ends), with the direction of
 * the segment it lies on. `cumulative` comes from cumulativeDistances(polyline).
 */
export function pointAtDistance(polyline: readonly Position[], cumulative: readonly number[], distance: number): TrackPoint {
  // Binary search for the segment [low, low + 1] holding `distance`.
  let low = 0;
  let high = polyline.length - 2;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid + 1]! < distance) low = mid + 1;
    else high = mid;
  }
  const a = polyline[low]!;
  const b = polyline[low + 1]!;
  const length = cumulative[low + 1]! - cumulative[low]!;
  const t = length > 0 ? Math.max(0, Math.min(1, (distance - cumulative[low]!) / length)) : 0;
  return { lon: a[0] + t * (b[0] - a[0]), lat: a[1] + t * (b[1] - a[1]), bearing: bearingDegrees(a, b) };
}

/**
 * Where the polyline passes closest to `point`: the distance along it (meters, `cumulative` from
 * cumulativeDistances) and how far the point lies from it.
 */
export function locateOnPolyline(
  point: Position,
  polyline: readonly Position[],
  cumulative: readonly number[],
): { along: number; offset: number } {
  const project = createLocalProjection(point);
  const plane = polyline.map(project);
  const origin = { x: 0, y: 0 };
  let best = { along: 0, offset: Infinity };
  for (let i = 0; i < plane.length - 1; i++) {
    const offset = distanceToSegment(origin, plane[i]!, plane[i + 1]!);
    if (offset >= best.offset) continue;
    const t = segmentFraction(origin, plane[i]!, plane[i + 1]!);
    best = { along: cumulative[i]! + t * (cumulative[i + 1]! - cumulative[i]!), offset };
  }
  return best;
}

/** The part of a polyline between two distances along it, given in either order. */
export function slicePolyline(polyline: readonly Position[], cumulative: readonly number[], from: number, to: number): LonLat[] {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const at = (distance: number): LonLat => {
    const { lon, lat } = pointAtDistance(polyline, cumulative, distance);
    return [lon, lat];
  };
  const inside = polyline.filter((_, i) => cumulative[i]! > start && cumulative[i]! < end).map(([lon, lat]): LonLat => [lon, lat]);
  return [at(start), ...inside, at(end)];
}
