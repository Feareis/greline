import type { TransitPattern, TransitSchedule, TransitTrip } from "@greline/types";

/** Where a tram is right now: how far along the track of its pattern. */
export interface VehiclePosition {
  /** Unique per running trip (a trip id can appear on two service days). */
  key: string;
  tripId: string;
  lineId: string;
  /** Index in TransitSchedule.patterns; its `shape` is the track the tram runs on. */
  pattern: number;
  /** Meters along the pattern's shape. */
  distance: number;
  delaySeconds: number;
}

/** Unique per running trip: a trip id can appear on two service days, with another start. */
export const vehicleKey = (trip: TransitTrip): string => `${trip.id}@${trip.start}`;

/**
 * Positions of every tram running at `now` (Unix seconds), interpolated linearly in time
 * between scheduled departures at its stops, the whole trip shifted by its realtime delay.
 * ponytail: one delay for the whole trip (no per-stop catch-up); per-stop estimates would need
 * one M API request per station.
 */
export function vehiclePositions(
  schedule: TransitSchedule,
  delays: Readonly<Record<string, number>>,
  now: number,
): VehiclePosition[] {
  const positions: VehiclePosition[] = [];
  for (const trip of schedule.trips) {
    const delaySeconds = delays[trip.id] ?? 0;
    const elapsed = now - delaySeconds - trip.start;
    const { offsets } = trip;
    if (elapsed < 0 || elapsed >= offsets[offsets.length - 1]!) continue;
    // Last stop already departed from; zero-length segments (same time at two stops) are skipped.
    let segment = 0;
    while (segment < offsets.length - 2 && offsets[segment + 1]! <= elapsed) segment++;
    const from = offsets[segment]!;
    const to = offsets[segment + 1]!;
    const pattern = schedule.patterns[trip.pattern]!;
    const progress = to > from ? (elapsed - from) / (to - from) : 0;
    const start = pattern.stopDistances[segment]!;
    positions.push({
      key: vehicleKey(trip),
      tripId: trip.id,
      lineId: pattern.lineId,
      pattern: trip.pattern,
      distance: start + progress * (pattern.stopDistances[segment + 1]! - start),
      delaySeconds,
    });
  }
  return positions;
}

/** The trip behind a vehicle key, and the schedule it belongs to; null when none has it. */
export function findTrip(
  schedules: readonly TransitSchedule[],
  key: string,
): { schedule: TransitSchedule; trip: TransitTrip } | null {
  for (const schedule of schedules) {
    const trip = schedule.trips.find((candidate) => vehicleKey(candidate) === key);
    if (trip) return { schedule, trip };
  }
  return null;
}

/** A stop a vehicle has not left yet: when it should leave it, in Unix seconds, delay included. */
export interface UpcomingStop {
  stopId: string;
  time: number;
}

/** Stops of a trip not left yet at `now` (Unix seconds); empty once it has reached its terminus. */
export function upcomingStops(trip: TransitTrip, pattern: TransitPattern, delaySeconds: number, now: number): UpcomingStop[] {
  const elapsed = now - delaySeconds - trip.start;
  return trip.offsets.flatMap((offset, i) =>
    offset > elapsed ? [{ stopId: pattern.stopIds[i]!, time: trip.start + offset + delaySeconds }] : [],
  );
}
