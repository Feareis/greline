import { serviceDayOrigin } from "@greline/services";
import type { TramPattern, TramSchedule, TramTrip } from "@greline/types";
import { csvRecords, csvTable, splitCsvLine } from "./csv";

/** GTFS files needed to build the tram schedule of a day. */
export const GTFS_SCHEDULE_FILES = ["routes.txt", "trips.txt", "stop_times.txt", "stops.txt", "calendar.txt", "calendar_dates.txt"];

type GtfsFiles = ReadonlyMap<string, string>;

/** Ids in our API and in the realtime feed carry the agency prefix ("SEM:32135884", "SEM:GENGAR"). */
const AGENCY_PREFIX = "SEM:";
const TRAM_ROUTE_TYPE = "0";
const SECONDS_PER_DAY = 86_400;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function file(files: GtfsFiles, name: string): string {
  const text = files.get(name);
  if (text === undefined) throw new Error(`GTFS feed has no ${name}`);
  return text;
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** "25:47:00" -> seconds since the service day origin (GTFS times may exceed 24:00). */
function parseGtfsTime(value: string): number {
  const [hours = 0, minutes = 0, seconds = 0] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function activeServices(files: GtfsFiles, date: string): Set<string> {
  const day = date.replaceAll("-", "");
  const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]!;
  const active = new Set(
    csvRecords(file(files, "calendar.txt"))
      .filter((s) => s[weekday] === "1" && s.start_date! <= day && day <= s.end_date!)
      .map((s) => s.service_id!),
  );
  for (const exception of csvRecords(file(files, "calendar_dates.txt"))) {
    if (exception.date !== day) continue;
    if (exception.exception_type === "1") active.add(exception.service_id!);
    else active.delete(exception.service_id!);
  }
  return active;
}

/** Platform stop_id -> station id ("2109" -> "SEM:GENLP"), through the parent station's code. */
function stationIds(files: GtfsFiles): Map<string, string> {
  const stops = csvRecords(file(files, "stops.txt"));
  const codeById = new Map(stops.map((s) => [s.stop_id!, s.stop_code!]));
  return new Map(stops.map((s) => [s.stop_id!, AGENCY_PREFIX + (codeById.get(s.parent_station!) ?? s.stop_code)]));
}

interface TripInstance {
  lineId: string;
  headsign: string;
  origin: number;
  previousDay: boolean;
}

/** Tram trips running on `date`, plus those of the day before (kept if they run past midnight). */
function tripInstances(files: GtfsFiles, date: string): Map<string, TripInstance[]> {
  const lineIds = new Map(
    csvRecords(file(files, "routes.txt"))
      .filter((r) => r.route_type === TRAM_ROUTE_TYPE)
      .map((r) => [r.route_id!, AGENCY_PREFIX + r.route_short_name]),
  );
  const yesterday = shiftDate(date, -1);
  const days = [
    { services: activeServices(files, date), origin: serviceDayOrigin(date), previousDay: false },
    { services: activeServices(files, yesterday), origin: serviceDayOrigin(yesterday), previousDay: true },
  ];
  const instances = new Map<string, TripInstance[]>();
  for (const trip of csvRecords(file(files, "trips.txt"))) {
    const lineId = lineIds.get(trip.route_id!);
    if (!lineId) continue;
    const running = days.filter((d) => d.services.has(trip.service_id!));
    if (running.length === 0) continue;
    instances.set(
      trip.trip_id!,
      running.map((d) => ({ lineId, headsign: trip.trip_headsign!, origin: d.origin, previousDay: d.previousDay })),
    );
  }
  return instances;
}

interface StopTime {
  sequence: number;
  stopId: string;
  seconds: number;
}

/** stop_times of the given trips, in stop_sequence order. Other trips' lines are never split. */
function stopTimesOf(files: GtfsFiles, tripIds: ReadonlySet<string>): Map<string, StopTime[]> {
  const table = csvTable(file(files, "stop_times.txt"));
  const trip = table.column("trip_id");
  const stop = table.column("stop_id");
  const departure = table.column("departure_time");
  const sequence = table.column("stop_sequence");
  const byTrip = new Map<string, StopTime[]>();
  for (const line of table.lines) {
    // Fast path: trip_id is the first column in practice, so most lines are skipped unsplit.
    if (trip === 0 && !tripIds.has(line.slice(0, line.indexOf(",")))) continue;
    const fields = splitCsvLine(line);
    const tripId = fields[trip]!;
    if (!tripIds.has(tripId)) continue;
    const list = byTrip.get(tripId) ?? [];
    list.push({ sequence: Number(fields[sequence]), stopId: fields[stop]!, seconds: parseGtfsTime(fields[departure]!) });
    byTrip.set(tripId, list);
  }
  for (const list of byTrip.values()) list.sort((a, b) => a.sequence - b.sequence);
  return byTrip;
}

/** Interns patterns: trips serving the same stops of a line share one entry. */
function patternRegistry() {
  const patterns: TramPattern[] = [];
  const indexByKey = new Map<string, number>();
  const indexOf = (pattern: TramPattern): number => {
    const key = `${pattern.lineId}|${pattern.headsign}|${pattern.stopIds.join(",")}`;
    const known = indexByKey.get(key);
    if (known !== undefined) return known;
    patterns.push(pattern);
    indexByKey.set(key, patterns.length - 1);
    return patterns.length - 1;
  };
  return { patterns, indexOf };
}

/** The tram schedule of a service day ("YYYY-MM-DD"), from the text files of a GTFS feed. */
export function buildTramSchedule(files: GtfsFiles, serviceDate: string): TramSchedule {
  const instances = tripInstances(files, serviceDate);
  const stopTimes = stopTimesOf(files, new Set(instances.keys()));
  const stations = stationIds(files);
  const registry = patternRegistry();
  const trips: TramTrip[] = [];
  for (const [tripId, runs] of instances) {
    const times = stopTimes.get(tripId) ?? [];
    if (times.length < 2) continue;
    const { lineId, headsign } = runs[0]!;
    const stopIds = times.map((t) => stations.get(t.stopId) ?? AGENCY_PREFIX + t.stopId);
    const pattern = registry.indexOf({ lineId, headsign, stopIds });
    const first = times[0]!.seconds;
    const offsets = times.map((t) => t.seconds - first);
    const runsPastMidnight = times.at(-1)!.seconds >= SECONDS_PER_DAY;
    for (const run of runs) {
      if (run.previousDay && !runsPastMidnight) continue;
      trips.push({ id: AGENCY_PREFIX + tripId, pattern, start: run.origin + first, offsets });
    }
  }
  trips.sort((a, b) => a.start - b.start);
  return { serviceDate, patterns: registry.patterns, trips };
}
