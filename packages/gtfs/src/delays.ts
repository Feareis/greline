import { mStopTimesSchema, type MStopTimes } from "@greline/validation";
import { stopTimesUrl } from "./fetch-departures";
import { type FetchLike, fetchFromMApi, MApiError } from "./fetch-network";
import { lineIdOfPattern } from "./to-departures";

/**
 * Probe a station every 8 stops: a probe lists each pattern's next ~3 departures (~15 min at
 * tram headways), so nearly every running tram is approaching a probe, for ~12 requests in all.
 */
export const DELAY_PROBE_SPACING = 8;

/** Stations sampled every `spacing` stops of each line, starting half a spacing in. */
export function delayProbeStations(lines: readonly { stopIds: readonly string[] }[], spacing = DELAY_PROBE_SPACING): string[] {
  const stations = new Set<string>();
  for (const line of lines) {
    for (let i = Math.floor(spacing / 2); i < line.stopIds.length; i += spacing) stations.add(line.stopIds[i]!);
  }
  return [...stations];
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

/** Realtime delays of the trams approaching the probe stations. Fails only if every probe fails. */
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
