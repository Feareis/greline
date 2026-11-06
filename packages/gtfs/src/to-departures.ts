import { departureSeconds, serviceTimeToDate } from "@greline/services";
import type { Departure } from "@greline/types";
import type { MStopTimes } from "@greline/validation";

/** Pattern ids start with the route id: "SEM:B:1:234041489" -> "SEM:B". */
export const lineIdOfPattern = (patternId: string): string => patternId.split(":").slice(0, 2).join(":");

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
      headsign: pattern.desc,
      departureTime: serviceTimeToDate(time.serviceDay, departureSeconds(time)).toISOString(),
      realtime: time.realtime,
    }));
  });
}
