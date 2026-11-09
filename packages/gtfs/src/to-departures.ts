import { departureSeconds, serviceTimeToDate } from "@greline/services";
import type { Departure, Occupancy } from "@greline/types";
import type { MStopTimes } from "@greline/validation";

/** Pattern ids start with the route id: "SEM:B:1:234041489" -> "SEM:B". */
export const lineIdOfPattern = (patternId: string): string => patternId.split(":").slice(0, 2).join(":");

/** Then the direction, numbered like the timesheets: "SEM:B:1:234041489" -> "1". */
export const directionOfPattern = (patternId: string): string => patternId.split(":")[2] ?? "";

/**
 * M occupancy ids. Only 1 and 2 were seen so far (their dataset labels them below 20 % and
 * 20-49 % of capacity): 3 is the next level up. Any other id is treated as unknown.
 */
const OCCUPANCY_LEVELS: Readonly<Record<number, Occupancy>> = { 1: "low", 2: "medium", 3: "high" };

export const occupancyOf = (occupancyId: number | undefined): Occupancy | null =>
  (occupancyId !== undefined && OCCUPANCY_LEVELS[occupancyId]) || null;

/**
 * Converts M API stoptimes into departures, keeping only `lineIds` (a station also serves buses
 * and coaches). Order follows the M API; sorting is the caller's job (see groupDepartures).
 */
export function toDepartures(stopTimes: MStopTimes, stopId: string, lineIds: ReadonlySet<string>): Departure[] {
  return stopTimes.flatMap(({ pattern, times }) => {
    const lineId = lineIdOfPattern(pattern.id);
    if (!lineIds.has(lineId)) return [];
    return times.map((time) => ({
      lineId,
      stopId,
      direction: directionOfPattern(pattern.id),
      headsign: pattern.desc,
      departureTime: serviceTimeToDate(time.serviceDay, departureSeconds(time)).toISOString(),
      realtime: time.realtime,
      occupancy: occupancyOf(time.occupancyId),
    }));
  });
}
