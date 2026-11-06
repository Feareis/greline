import type { TramSchedule } from "@greline/types";

/** Where a tram is right now: between two consecutive stations of its trip. */
export interface VehiclePosition {
  /** Unique per running trip (a trip id can appear on two service days). */
  key: string;
  tripId: string;
  lineId: string;
  fromStopId: string;
  toStopId: string;
  /** 0 at `fromStopId`, 1 at `toStopId`. */
  progress: number;
  delaySeconds: number;
}

/**
 * Positions of every tram running at `now` (Unix seconds), interpolated linearly in time
 * between scheduled departures, the whole trip shifted by its realtime delay.
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
    positions.push({
      key: `${trip.id}@${trip.start}`,
      tripId: trip.id,
      lineId: pattern.lineId,
      fromStopId: pattern.stopIds[segment]!,
      toStopId: pattern.stopIds[segment + 1]!,
      progress: to > from ? (elapsed - from) / (to - from) : 0,
      delaySeconds,
    });
  }
  return positions;
}
