import type { SchematicPath, SchematicPoint } from "@greline/types";

/** A line reduced to the ordered ids of the stations it serves. */
export interface LineStations {
  id: string;
  stationIds: readonly string[];
}

interface Segment {
  start: SchematicPoint;
  end: SchematicPoint;
}

const samePoint = (a: SchematicPoint, b: SchematicPoint): boolean => a.x === b.x && a.y === b.y;

/**
 * Octilinear route between two stations with at most one bend: a 45 degree diagonal from
 * `from`, then a horizontal or vertical run to `to` (the classic metro-game look).
 */
export function routeEdge(from: SchematicPoint, to: SchematicPoint): SchematicPoint[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const diagonal = Math.min(Math.abs(dx), Math.abs(dy));
  const bend = { x: from.x + Math.sign(dx) * diagonal, y: from.y + Math.sign(dy) * diagonal };
  if (diagonal === 0 || samePoint(bend, to)) return [from, to];
  return [from, bend, to];
}

// Edges are always routed west to east (then north to south) so that every line sharing an
// edge gets the same bend, and so that "left of the edge" means the same side for all of them
// whatever their travel direction.
const isWestToEast = (a: SchematicPoint, b: SchematicPoint): boolean =>
  a.x < b.x || (a.x === b.x && a.y < b.y);

const edgeKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

function offsetSegment({ start, end }: Segment, offset: number): Segment {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const normalX = -(end.y - start.y) / length;
  const normalY = (end.x - start.x) / length;
  const shift = (p: SchematicPoint) => ({ x: p.x + offset * normalX, y: p.y + offset * normalY });
  return { start: shift(start), end: shift(end) };
}

/** Intersection of the infinite lines carrying two segments, or null when they are parallel. */
function intersect(a: Segment, b: Segment): SchematicPoint | null {
  const d1 = { x: a.end.x - a.start.x, y: a.end.y - a.start.y };
  const d2 = { x: b.end.x - b.start.x, y: b.end.y - b.start.y };
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-9 * Math.hypot(d1.x, d1.y) * Math.hypot(d2.x, d2.y)) return null;
  const t = ((b.start.x - a.start.x) * d2.y - (b.start.y - a.start.y) * d2.x) / cross;
  return { x: a.start.x + t * d1.x, y: a.start.y + t * d1.y };
}

/** Chains segments into one polyline: miter joins at corners, short jogs between parallel ones. */
function joinSegments(segments: readonly Segment[]): SchematicPoint[] {
  const points: SchematicPoint[] = [segments[0]!.start];
  for (let i = 1; i < segments.length; i++) {
    const previous = segments[i - 1]!;
    const current = segments[i]!;
    const corner = intersect(previous, current);
    if (corner) {
      points.push(corner);
      continue;
    }
    points.push(previous.end);
    if (!samePoint(previous.end, current.start)) points.push(current.start);
  }
  points.push(segments[segments.length - 1]!.end);
  return points;
}

/** Drops points that lie in the middle of a straight run (consecutive stations on one axis). */
function removeCollinearPoints(points: readonly SchematicPoint[]): SchematicPoint[] {
  return points.filter((point, i) => {
    const before = points[i - 1];
    const after = points[i + 1];
    if (!before || !after) return true;
    const cross = (point.x - before.x) * (after.y - point.y) - (point.y - before.y) * (after.x - point.x);
    const dot = (point.x - before.x) * (after.x - point.x) + (point.y - before.y) * (after.y - point.y);
    return Math.abs(cross) > 1e-9 || dot <= 0;
  });
}

function groupLinesByEdge(lines: readonly LineStations[]): Map<string, string[]> {
  const linesPerEdge = new Map<string, string[]>();
  for (const line of lines) {
    for (let i = 1; i < line.stationIds.length; i++) {
      const key = edgeKey(line.stationIds[i - 1]!, line.stationIds[i]!);
      const lineIds = linesPerEdge.get(key) ?? [];
      if (!lineIds.includes(line.id)) lineIds.push(line.id);
      linesPerEdge.set(key, lineIds);
    }
  }
  return linesPerEdge;
}

function edgeSegments(from: SchematicPoint, to: SchematicPoint, offset: number): Segment[] {
  const forward = isWestToEast(from, to);
  const route = forward ? routeEdge(from, to) : routeEdge(to, from);
  const segments = route.slice(1).map((end, i) => offsetSegment({ start: route[i]!, end }, offset));
  if (forward) return segments;
  return segments.reverse().map(({ start, end }) => ({ start: end, end: start }));
}

/**
 * Draws every line as an octilinear polyline through its stations. Lines sharing an edge are
 * spread side by side, `spacing` units apart, in the order of `lines`.
 */
export function buildLinePaths(
  lines: readonly LineStations[],
  positions: ReadonlyMap<string, SchematicPoint>,
  spacing: number,
): SchematicPath[] {
  const linesPerEdge = groupLinesByEdge(lines);
  return lines.map((line) => {
    const segments: Segment[] = [];
    for (let i = 1; i < line.stationIds.length; i++) {
      const fromId = line.stationIds[i - 1]!;
      const toId = line.stationIds[i]!;
      const sharing = linesPerEdge.get(edgeKey(fromId, toId))!;
      const offset = (sharing.indexOf(line.id) - (sharing.length - 1) / 2) * spacing;
      segments.push(...edgeSegments(positions.get(fromId)!, positions.get(toId)!, offset));
    }
    return { lineId: line.id, points: removeCollinearPoints(joinSegments(segments)) };
  });
}
