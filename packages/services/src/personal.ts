import type { Departure, NetworkLine } from "@greline/types";
import { stopIdSchema } from "@greline/validation";

/** A favorite stop list read back from storage: valid stop ids only, each once, order kept. */
export function parseFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((id): id is string => stopIdSchema.safeParse(id).success);
  return [...new Set(ids)];
}

/** Adds the stop at the end of the favorites, or removes it if it already is one. */
export function toggleFavorite(favorites: readonly string[], stopId: string): string[] {
  return favorites.includes(stopId) ? favorites.filter((id) => id !== stopId) : [...favorites, stopId];
}

/** The user's usual trip ("home to work"); either end may still be missing while it is set up. */
export interface SavedTrip {
  from: string | null;
  to: string | null;
}

export const NO_TRIP: SavedTrip = { from: null, to: null };

/** A trip read back from storage; anything unexpected becomes "no trip". */
export function parseTrip(raw: unknown): SavedTrip {
  if (typeof raw !== "object" || raw === null) return NO_TRIP;
  const end = (value: unknown): string | null => (stopIdSchema.safeParse(value).success ? (value as string) : null);
  const { from, to } = raw as Record<string, unknown>;
  return { from: end(from), to: end(to) };
}

/** A line and direction serving the trip's start, then its end, without changing vehicle. */
export interface TripLeg {
  lineId: string;
  direction: string;
}

/** Every direct way from one stop to another: lines whose direction passes `from`, then `to`. */
export function directTripLegs(lines: readonly NetworkLine[], from: string, to: string): TripLeg[] {
  return lines.flatMap((line) =>
    line.directions
      .filter((direction) => {
        const start = direction.stopIds.indexOf(from);
        return start >= 0 && direction.stopIds.indexOf(to, start + 1) > start;
      })
      .map((direction) => ({ lineId: line.id, direction: direction.id })),
  );
}

/** Departures at the trip's start that take one of its direct legs, soonest first. */
export function tripDepartures(departures: readonly Departure[], legs: readonly TripLeg[]): Departure[] {
  return departures
    .filter((d) => legs.some((leg) => leg.lineId === d.lineId && leg.direction === d.direction))
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}
