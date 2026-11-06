import type { TramSchedule } from "@greline/types";

/** Where a tram is right now: how far along the track of its pattern. */
export interface VehiclePosition {
  /** Unique per running trip (a trip id can appear on two service days). */
  key: string;
  tripId: string;
  lineId: string;
  /** Index in TramSchedule.patterns; its `shape` is the track the tram runs on. */
  pattern: number;
  /** Meters along the pattern's shape. */
  distance: number;
  delaySeconds: number;
}

/**
 * Positions of every tram running at `now` (Unix seconds), interpolated linearly in time
 * between scheduled departures at its stops, the whole trip shifted by its realtime delay.
 * ponytail: one delay for the whole trip (no per-stop catch-up); per-stop estimates would need
 * one M API request per station.
 */
export function vehiclePositions(
  schedule: TramSchedule,
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
      key: `${trip.id}@${trip.start}`,
      tripId: trip.id,
      lineId: pattern.lineId,
      pattern: trip.pattern,
      distance: start + progress * (pattern.stopDistances[segment + 1]! - start),
      delaySeconds,
    });
  }
  return positions;
}
