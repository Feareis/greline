import { createLocalProjection, distanceToSegment, type Position, segmentFraction } from "@greline/services";
import type { LonLat } from "@greline/types";
import { csvTable, splitCsvLine } from "./csv";

/** shape_id -> its points in shape_pt_sequence order, for the requested shapes only. */
export function readShapes(text: string, shapeIds: ReadonlySet<string>): Map<string, LonLat[]> {
  const table = csvTable(text);
  const id = table.column("shape_id");
  const lat = table.column("shape_pt_lat");
  const lon = table.column("shape_pt_lon");
  const sequence = table.column("shape_pt_sequence");
  const points = new Map<string, { sequence: number; position: LonLat }[]>();
  for (const line of table.lines) {
    // Fast path: shape_id is the first column in practice and bus shapes are the vast majority.
    if (id === 0 && !shapeIds.has(line.slice(0, line.indexOf(",")))) continue;
    const fields = splitCsvLine(line);
    const shapeId = fields[id]!;
    if (!shapeIds.has(shapeId)) continue;
    const list = points.get(shapeId) ?? [];
    list.push({ sequence: Number(fields[sequence]), position: [Number(fields[lon]), Number(fields[lat])] });
    points.set(shapeId, list);
  }
  const shapes = new Map<string, LonLat[]>();
  for (const [shapeId, list] of points) {
    list.sort((a, b) => a.sequence - b.sequence);
    shapes.set(shapeId, list.map((p) => p.position));
  }
  return shapes;
}

const samePosition = (a: Position, b: Position): boolean => a[0] === b[0] && a[1] === b[1];

/**
 * Douglas-Peucker simplification: drops points closer than `toleranceMeters` to the line
 * through their neighbours. Consecutive duplicates are removed first.
 */
export function simplifyPolyline(points: readonly LonLat[], toleranceMeters: number): LonLat[] {
  const unique = points.filter((p, i) => i === 0 || !samePosition(p, points[i - 1]!));
  if (unique.length <= 2) return unique;
  const project = createLocalProjection(unique[0]!);
  const plane = unique.map(project);
  const keep = new Array<boolean>(unique.length).fill(false);
  keep[0] = true;
  keep[unique.length - 1] = true;
  // Explicit stack instead of recursion: bounded by the number of points.
  const ranges: [number, number][] = [[0, unique.length - 1]];
  while (ranges.length > 0) {
    const [first, last] = ranges.pop()!;
    let farthest = -1;
    let farthestDistance = toleranceMeters;
    for (let i = first + 1; i < last; i++) {
      const distance = distanceToSegment(plane[i]!, plane[first]!, plane[last]!);
      if (distance > farthestDistance) {
        farthest = i;
        farthestDistance = distance;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = true;
    ranges.push([first, farthest], [farthest, last]);
  }
  return unique.filter((_, i) => keep[i]);
}

/**
 * Distance along the polyline (meters, `cumulative` from cumulativeDistances) of each stop, in
 * travel order. Each stop is searched from the previous stop's segment onwards, so distances
 * never go backwards. ponytail: assumes the track does not pass twice near the same stop
 * (true for Grenoble trams); a loop line would need a windowed search.
 */
export function stopDistancesAlong(polyline: readonly Position[], cumulative: readonly number[], stops: readonly Position[]): number[] {
  const project = createLocalProjection(polyline[0]!);
  const plane = polyline.map(project);
  let fromSegment = 0;
  let previous = 0;
  return stops.map((stop) => {
    const point = project(stop);
    let best = fromSegment;
    let bestDistance = Infinity;
    for (let i = fromSegment; i < plane.length - 1; i++) {
      const distance = distanceToSegment(point, plane[i]!, plane[i + 1]!);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    fromSegment = best;
    const t = segmentFraction(point, plane[best]!, plane[best + 1]!);
    // Two stops on the same segment could still project in reverse order.
    previous = Math.max(previous, cumulative[best]! + t * (cumulative[best + 1]! - cumulative[best]!));
    return previous;
  });
}
