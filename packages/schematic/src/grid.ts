/** Grid step (in SVG units) used to align stations on the schematic map. */
export const SCHEMATIC_GRID = 8;

/** Snaps a coordinate to the schematic grid. */
export function snapToGrid(value: number, grid: number = SCHEMATIC_GRID): number {
  return Math.round(value / grid) * grid;
}

/** Snaps an angle (degrees) to the nearest multiple of 45, as on metro-style maps. */
export function snapAngle(degrees: number): number {
  const snapped = Math.round(degrees / 45) * 45;
  return ((snapped % 360) + 360) % 360;
}
