import { cumulativeDistances, serviceDayOrigin } from "@greline/services";
import type { LonLat, TramPattern, TramSchedule, TramTrip } from "@greline/types";
import { csvRecords, csvTable, splitCsvLine } from "./csv";
import { readShapes, simplifyPolyline, stopDistancesAlong } from "./shapes";

/** GTFS files needed to build the tram schedule of a day. */
export const GTFS_SCHEDULE_FILES = ["routes.txt", "trips.txt", "stop_times.txt", "stops.txt", "calendar.txt", "calendar_dates.txt", "shapes.txt"];

type GtfsFiles = ReadonlyMap<string, string>;

/** Ids in our API and in the realtime feed carry the agency prefix ("SEM:32135884", "SEM:GENGAR"). */
const AGENCY_PREFIX = "SEM:";
const TRAM_ROUTE_TYPE = "0";
const SECONDS_PER_DAY = 86_400;
/** Track points closer than this to a straight line are dropped: invisible on a map, much lighter. */
const SHAPE_TOLERANCE_M = 2;
/** 5 decimals of a degree is ~1 m. */
const roundCoordinate = (value: number): number => Math.round(value * 1e5) / 1e5;
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

interface PlatformIndex {
  /** Platform stop_id -> station id ("2109" -> "SEM:GENLP"), through the parent station's code. */
  stationOf: Map<string, string>;
  positionOf: Map<string, LonLat>;
}

function platformIndex(files: GtfsFiles): PlatformIndex {
  const stops = csvRecords(file(files, "stops.txt"));
  const codeById = new Map(stops.map((s) => [s.stop_id!, s.stop_code!]));
  return {
    stationOf: new Map(stops.map((s) => [s.stop_id!, AGENCY_PREFIX + (codeById.get(s.parent_station!) ?? s.stop_code)])),
    positionOf: new Map(stops.map((s) => [s.stop_id!, [Number(s.stop_lon), Number(s.stop_lat)]])),
  };
}

interface TripInstance {
  lineId: string;
  headsign: string;
  shapeId: string;
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
      running.map((d) => ({
        lineId,
        headsign: trip.trip_headsign!,
        shapeId: trip.shape_id ?? "",
        origin: d.origin,
        previousDay: d.previousDay,
      })),
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

interface PatternKey {
  lineId: string;
  headsign: string;
  shapeId: string;
  platformIds: string[];
}

/**
 * Interns shapes and patterns: trips on the same track serving the same platforms share one
 * pattern, patterns on the same track share one shape.
 */
function patternRegistry(rawShapes: ReadonlyMap<string, LonLat[]>, platforms: PlatformIndex) {
  const shapes: LonLat[][] = [];
  const cumulatives: number[][] = [];
  const shapeIndex = new Map<string, number>();
  const patterns: TramPattern[] = [];
  const patternIndex = new Map<string, number>();

  const addShape = (points: readonly LonLat[]): number => {
    const rounded = points.map(([lon, lat]): LonLat => [roundCoordinate(lon), roundCoordinate(lat)]);
    const shape = simplifyPolyline(rounded, SHAPE_TOLERANCE_M);
    shapes.push(shape);
    cumulatives.push(cumulativeDistances(shape));
    return shapes.length - 1;
  };
  const shapeFor = (shapeId: string, stops: readonly LonLat[]): number => {
    const raw = rawShapes.get(shapeId);
    // A trip without a GTFS shape is drawn straight from platform to platform.
    if (!raw) return addShape(stops);
    const known = shapeIndex.get(shapeId);
    if (known !== undefined) return known;
    const index = addShape(raw);
    shapeIndex.set(shapeId, index);
    return index;
  };
  const positionOf = (platformId: string): LonLat => {
    const position = platforms.positionOf.get(platformId);
    if (!position) throw new Error(`GTFS stop_times refers to unknown stop ${platformId}`);
    return position;
  };

  const indexOf = ({ lineId, headsign, shapeId, platformIds }: PatternKey): number => {
    const key = `${lineId}|${headsign}|${shapeId}|${platformIds.join(",")}`;
    const known = patternIndex.get(key);
    if (known !== undefined) return known;
    const stops = platformIds.map(positionOf);
    const shape = shapeFor(shapeId, stops);
    const stopDistances = stopDistancesAlong(shapes[shape]!, cumulatives[shape]!, stops).map(Math.round);
    const stopIds = platformIds.map((id) => platforms.stationOf.get(id) ?? AGENCY_PREFIX + id);
    patterns.push({ lineId, headsign, stopIds, shape, stopDistances });
    patternIndex.set(key, patterns.length - 1);
    return patterns.length - 1;
  };
  return { shapes, patterns, indexOf };
}

/** The tram schedule of a service day ("YYYY-MM-DD"), from the text files of a GTFS feed. */
export function buildTramSchedule(files: GtfsFiles, serviceDate: string): TramSchedule {
  const instances = tripInstances(files, serviceDate);
  const stopTimes = stopTimesOf(files, new Set(instances.keys()));
  const shapeIds = new Set([...instances.values()].flatMap((runs) => runs.map((run) => run.shapeId)));
  const registry = patternRegistry(readShapes(file(files, "shapes.txt"), shapeIds), platformIndex(files));
  const trips: TramTrip[] = [];
  for (const [tripId, runs] of instances) {
    const times = stopTimes.get(tripId) ?? [];
    if (times.length < 2) continue;
    const { lineId, headsign, shapeId } = runs[0]!;
    const pattern = registry.indexOf({ lineId, headsign, shapeId, platformIds: times.map((t) => t.stopId) });
    const first = times[0]!.seconds;
    const offsets = times.map((t) => t.seconds - first);
    const runsPastMidnight = times.at(-1)!.seconds >= SECONDS_PER_DAY;
    for (const run of runs) {
      if (run.previousDay && !runsPastMidnight) continue;
      trips.push({ id: AGENCY_PREFIX + tripId, pattern, start: run.origin + first, offsets });
    }
  }
  trips.sort((a, b) => a.start - b.start);
  return { serviceDate, shapes: registry.shapes, patterns: registry.patterns, trips };
}
