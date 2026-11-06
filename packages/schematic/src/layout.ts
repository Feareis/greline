import type { SchematicPoint } from "@greline/types";
import { snapToGrid } from "./grid";

/**
 * Pushes stations away from the origin with r' = R * (r / R)^exponent, where R is the largest
 * radius. With exponent < 1 the dense city center gets more room while long suburban branches
 * shrink, as on metro maps. The farthest station and the origin do not move.
 */
export function compressRadially(
  points: ReadonlyMap<string, SchematicPoint>,
  exponent: number,
): Map<string, SchematicPoint> {
  const maxRadius = Math.max(0, ...[...points.values()].map(({ x, y }) => Math.hypot(x, y)));
  const result = new Map<string, SchematicPoint>();
  for (const [id, point] of points) {
    const radius = Math.hypot(point.x, point.y);
    const factor = radius === 0 ? 0 : (maxRadius * (radius / maxRadius) ** exponent) / radius;
    result.set(id, { x: point.x * factor, y: point.y * factor });
  }
  return result;
}

// Rings searched around a taken node before giving up: 4 rings = 80 candidate nodes,
// far more than the handful of stations that can ever compete for one spot.
const MAX_COLLISION_RINGS = 4;

const nodeKey = ({ x, y }: SchematicPoint): string => `${x},${y}`;

function ringNodes(center: SchematicPoint, ring: number, grid: number): SchematicPoint[] {
  const nodes: SchematicPoint[] = [];
  for (let i = -ring; i <= ring; i++) {
    for (let j = -ring; j <= ring; j++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
      nodes.push({ x: center.x + i * grid, y: center.y + j * grid });
    }
  }
  return nodes;
}

function nearestFreeNode(
  point: SchematicPoint,
  grid: number,
  taken: ReadonlySet<string>,
): SchematicPoint {
  const ideal = { x: snapToGrid(point.x, grid), y: snapToGrid(point.y, grid) };
  if (!taken.has(nodeKey(ideal))) return ideal;
  for (let ring = 1; ring <= MAX_COLLISION_RINGS; ring++) {
    const free = ringNodes(ideal, ring, grid).filter((node) => !taken.has(nodeKey(node)));
    if (free.length === 0) continue;
    const distance = (node: SchematicPoint) => Math.hypot(node.x - point.x, node.y - point.y);
    return free.reduce((best, node) => (distance(node) < distance(best) ? node : best));
  }
  throw new Error(`No free grid node near (${point.x}, ${point.y}): stations are too crowded`);
}

/** Snaps stations to grid nodes, moving later stations to the nearest free node on collision. */
export function snapStationsToGrid(
  points: ReadonlyMap<string, SchematicPoint>,
  grid: number,
): Map<string, SchematicPoint> {
  const taken = new Set<string>();
  const result = new Map<string, SchematicPoint>();
  for (const [id, point] of points) {
    const node = nearestFreeNode(point, grid, taken);
    taken.add(nodeKey(node));
    result.set(id, node);
  }
  return result;
}
