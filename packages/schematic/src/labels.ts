import type { SchematicPoint } from "@greline/types";

export interface LabelCandidate {
  id: string;
  /** Center of the station the label belongs to. */
  anchor: SchematicPoint;
  /** Gap between the anchor and the start of the text (station radius + margin). */
  offset: number;
  text: string;
}

export type LabelSide = "left" | "right";

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// ponytail: text width estimated from the character count (average sans-serif glyph is ~0.55em);
// measure with getBBox() in the renderer if labels ever clip or float too far.
const AVERAGE_GLYPH_WIDTH_EM = 0.55;

function labelBox(candidate: LabelCandidate, side: LabelSide, fontSize: number): Box {
  const width = candidate.text.length * fontSize * AVERAGE_GLYPH_WIDTH_EM;
  const { x, y } = candidate.anchor;
  const left = side === "right" ? x + candidate.offset : x - candidate.offset - width;
  return { left, right: left + width, top: y - fontSize / 2, bottom: y + fontSize / 2 };
}

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Greedy label placement: each candidate, in priority order, goes right of its station, else
 * left, else is dropped. Returns the side of every placed label (insertion order kept).
 */
export function placeLabels(candidates: readonly LabelCandidate[], fontSize: number): Map<string, LabelSide> {
  const placed: Box[] = [];
  const sides = new Map<string, LabelSide>();
  for (const candidate of candidates) {
    for (const side of ["right", "left"] as const) {
      const box = labelBox(candidate, side, fontSize);
      if (placed.some((other) => overlaps(box, other))) continue;
      placed.push(box);
      sides.set(candidate.id, side);
      break;
    }
  }
  return sides;
}
