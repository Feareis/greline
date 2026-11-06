import type { LineMode } from "@greline/types";
import { mStopTimesSchema, type MStopTimes } from "@greline/validation";
import { stopTimesUrl } from "./fetch-departures";
import { type FetchLike, fetchFromMApi, MApiError } from "./fetch-network";
import { lineIdOfPattern } from "./to-departures";

/**
 * At most this many stops between two probes of a line. A probe lists each pattern's next ~3
 * departures: ~15 min at tram headways, 30 min and more for buses, which run less often.
 */
export const PROBE_SPACING: Readonly<Record<LineMode, number>> = { tram: 8, bus: 12 };

interface ProbedLine {
  mode: LineMode;
  stopIds: readonly string[];
}

/**
 * Stations to ask for realtime departures so every line has a probe at least every
 * PROBE_SPACING stops. A probe answers for every line serving its station, so each window of a
 * line reuses an already chosen station, or else picks its busiest one (~35 probes for trams,
 * Chrono and Proximo, against ~70 with fixed sampling).
 */
export function delayProbeStations(lines: readonly ProbedLine[]): string[] {
  const linesAt = new Map<string, number>();
  for (const line of lines) for (const id of line.stopIds) linesAt.set(id, (linesAt.get(id) ?? 0) + 1);
  const chosen = new Set<string>();
  // Long lines first: their probes are the most likely to serve shorter lines too.
  for (const line of [...lines].sort((a, b) => b.stopIds.length - a.stopIds.length)) {
    const spacing = PROBE_SPACING[line.mode];
    for (let start = 0; start < line.stopIds.length; start += spacing) {
      const window = line.stopIds.slice(start, start + spacing);
      if (window.some((id) => chosen.has(id))) continue;
      chosen.add(window.reduce((best, id) => (linesAt.get(id)! > linesAt.get(best)! ? id : best)));
    }
  }
  return [...chosen];
}

/**
 * Delay in seconds of each realtime trip of `lineIds` (stations also serve buses and coaches).
 * A trip seen at several stations keeps the measure of its next stop (the earliest departure),
 * which is the freshest estimate.
 */
export function toTripDelays(responses: readonly MStopTimes[], lineIds: ReadonlySet<string>): Record<string, number> {
  const closest = new Map<string, { departure: number; delay: number }>();
  for (const stopTimes of responses) {
    for (const { pattern, times } of stopTimes) {
      if (!lineIds.has(lineIdOfPattern(pattern.id))) continue;
      for (const time of times) {
        if (!time.realtime) continue;
        const departure = time.serviceDay + time.realtimeDeparture;
        const known = closest.get(time.tripId);
        if (known && known.departure <= departure) continue;
        closest.set(time.tripId, { departure, delay: time.realtimeDeparture - time.scheduledDeparture });
      }
    }
  }
  return Object.fromEntries([...closest].map(([tripId, { delay }]) => [tripId, delay]));
}

export interface TripDelays {
  /** Delay in seconds, keyed by trip id ("SEM:32135884"). Trips not listed have no realtime data. */
  delays: Record<string, number>;
  /** Probe stations whose request failed (their trips simply get no delay). */
  failedStations: number;
}

/** Realtime delays of the vehicles approaching the probe stations. Fails only if every probe fails. */
export async function fetchTripDelays(
  stationIds: readonly string[],
  lineIds: ReadonlySet<string>,
  fetchFn: FetchLike = fetch,
): Promise<TripDelays> {
  const results = await Promise.allSettled(stationIds.map((id) => fetchFromMApi(stopTimesUrl(id), mStopTimesSchema, fetchFn, [])));
  const answers = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  if (answers.length === 0 && stationIds.length > 0) {
    const firstFailure = results.find((result) => result.status === "rejected");
    throw new MApiError(`M API: all ${stationIds.length} delay probe stations failed`, { cause: firstFailure?.reason });
  }
  return { delays: toTripDelays(answers, lineIds), failedStations: results.length - answers.length };
}
