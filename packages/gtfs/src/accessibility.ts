import type { StopAccess } from "@greline/types";
import { csvRecords } from "./csv";

/** GTFS `wheelchair_boarding` of a platform: 1 = boarding possible, 2 = not possible, 0 = unknown. */
const ACCESSIBLE = "1";
const INACCESSIBLE = "2";

/**
 * Wheelchair access of each station of a GTFS `stops.txt`, keyed like our stop ids ("SEM:GENGAR").
 * The SEM feed rates platforms only (its stations all say 0): a station is accessible when all
 * its platforms are, partial when some are. Stations with no rated platform are left out.
 */
export function stopAccessibility(stopsTxt: string): Record<string, StopAccess> {
  const stops = csvRecords(stopsTxt);
  const codeById = new Map(stops.map((stop) => [stop.stop_id!, stop.stop_code!]));
  const platformsOf = new Map<string, string[]>();
  for (const stop of stops) {
    const station = stop.parent_station;
    if (!station) continue;
    platformsOf.set(station, [...(platformsOf.get(station) ?? []), stop.wheelchair_boarding ?? ""]);
  }
  const access: Record<string, StopAccess> = {};
  for (const [station, ratings] of platformsOf) {
    const level = stationLevel(ratings);
    const code = codeById.get(station);
    if (level && code) access[`SEM:${code}`] = level;
  }
  return access;
}

function stationLevel(ratings: readonly string[]): StopAccess | null {
  const accessible = ratings.filter((rating) => rating === ACCESSIBLE).length;
  if (accessible === ratings.length) return "accessible";
  if (accessible > 0) return "partial";
  return ratings.includes(INACCESSIBLE) ? "inaccessible" : null;
}
