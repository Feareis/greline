import { cumulativeDistances, serviceDayOrigin } from "@greline/services";
import { describe, expect, it } from "vitest";
import { buildSchedule } from "./schedule";

const csv = (...lines: string[]) => `${lines.join("\r\n")}\r\n`;

// A tiny GTFS feed: tram A (route 91) and one bus (route 1). Friday 2026-11-06 is the test day.
const files = new Map([
  [
    "routes.txt",
    csv(
      "agency_id,route_id,network_id,route_short_name,route_long_name,route_type,route_color,route_text_color",
      'SEM,91,TRAM,A,"Fontaine, La Poya / Echirolles",0,3376B8,FFFFFF',
      "SEM,1,CHRONO,C1,Bus,3,F5D24D,000000",
    ),
  ],
  [
    "stops.txt",
    csv(
      "stop_id,stop_code,stop_name,stop_lat,stop_lon,zone_id,location_type,parent_station,wheelchair_boarding",
      'LP,GENLP,"Fontaine, La Poya",45.1971,5.67235,,1,,0',
      '2109,2109,"Fontaine, La Poya",45.19691,5.67249,1,,LP,1',
      "CM,GENCM,Charles Michels,45.1939,5.6802,,1,,0",
      "2041,2041,Charles Michels,45.1937,5.6804,1,,CM,1",
      "GAR,GENGAR,Gares,45.1915,5.7143,,1,,0",
      "2216,2216,Gares,45.1914,5.7145,1,,GAR,1",
    ),
  ],
  [
    "calendar.txt",
    csv(
      "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
      "WEEK,1,1,1,1,1,0,0,20260901,20261231",
      "SAT,0,0,0,0,0,1,0,20260901,20261231",
    ),
  ],
  [
    "shapes.txt",
    csv(
      "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled",
      // Tram A towards Gares, through the platforms; shape 2 is missing (drawn straight).
      "1,45.19691,5.67249,1,",
      "1,45.19691,5.67249,2,",
      "1,45.1937,5.6804,3,",
      "1,45.1914,5.7145,4,",
      "3,45.1914,5.7145,1,",
      "3,45.2,5.72,2,",
    ),
  ],
  ["calendar_dates.txt", csv("service_id,date,exception_type", "EXTRA,20261106,1", "WEEK,20261111,2")],
  [
    "trips.txt",
    csv(
      "route_id,trip_id,trip_headsign,service_id,direction_id,shape_id,wheelchair_accessible,bikes_allowed",
      '91,100,"Grenoble, Gares",WEEK,0,1,1,2',
      '91,101,"Grenoble, Gares",WEEK,0,1,1,2',
      '91,102,"Grenoble, Gares",SAT,0,1,1,2',
      '91,103,"Grenoble, Gares",EXTRA,0,1,1,2',
      '91,104,"Grenoble, Gares",WEEK,0,1,1,2',
      '91,105,"Fontaine, La Poya",WEEK,1,2,1,2',
      "1,200,Bus,WEEK,0,3,1,2",
    ),
  ],
  [
    "stop_times.txt",
    csv(
      "trip_id,stop_id,arrival_time,departure_time,stop_sequence,pickup_type,drop_off_type",
      "100,2109,08:00:00,08:00:00,1,0,0",
      "100,2041,08:02:00,08:02:30,2,0,0",
      "100,2216,08:10:00,08:10:00,3,0,0",
      "101,2109,09:00:00,09:00:00,1,0,0",
      "101,2041,09:02:00,09:02:00,2,0,0",
      "101,2216,09:10:00,09:10:00,3,0,0",
      "102,2109,10:00:00,10:00:00,1,0,0",
      "102,2216,10:10:00,10:10:00,2,0,0",
      "103,2109,11:00:00,11:00:00,1,0,0",
      "103,2041,11:02:00,11:02:00,2,0,0",
      "103,2216,11:10:00,11:10:00,3,0,0",
      "104,2109,24:10:00,24:10:00,1,0,0",
      "104,2041,24:12:00,24:12:00,2,0,0",
      "104,2216,24:20:00,24:20:00,3,0,0",
      "105,2109,08:40:00,08:40:00,3,0,0",
      "105,2216,08:30:00,08:30:00,1,0,0",
      "105,2041,08:38:00,08:38:00,2,0,0",
      "200,2216,08:00:00,08:00:00,1,0,0",
      "200,2041,08:06:00,08:06:00,2,0,0",
    ),
  ],
]);

const TRAMS = new Set(["TRAM"]);
const friday = serviceDayOrigin("2026-11-06");
const thursday = serviceDayOrigin("2026-11-05");

describe("buildSchedule", () => {
  const schedule = buildSchedule(files, "2026-11-06", TRAMS);
  const startsOf = (id: string) => schedule.trips.filter((t) => t.id === id).map((t) => t.start);

  it("keeps tram trips whose service runs that day, plus exceptions, and drops buses", () => {
    expect([...new Set(schedule.trips.map((t) => t.id))].sort()).toEqual(["SEM:100", "SEM:101", "SEM:103", "SEM:104", "SEM:105"]);
  });

  it("adds the previous day's trips that run past midnight, with that day's origin", () => {
    expect(startsOf("SEM:104")).toEqual([thursday + 24 * 3600 + 600, friday + 24 * 3600 + 600]);
    expect(startsOf("SEM:100")).toEqual([friday + 8 * 3600]);
  });

  it("stores departures as offsets from the first stop, in stop_sequence order", () => {
    const trip105 = schedule.trips.find((t) => t.id === "SEM:105")!;
    expect(trip105.offsets).toEqual([0, 480, 600]);
    expect(schedule.patterns[trip105.pattern]!.stopIds).toEqual(["SEM:GENGAR", "SEM:GENCM", "SEM:GENLP"]);
    expect(schedule.trips.find((t) => t.id === "SEM:100")!.offsets).toEqual([0, 150, 600]);
  });

  it("shares one pattern between trips serving the same stops on the same track", () => {
    expect(schedule.patterns.map(({ lineId, headsign, stopIds, shape }) => ({ lineId, headsign, stopIds, shape }))).toEqual([
      { lineId: "SEM:A", headsign: "Grenoble, Gares", stopIds: ["SEM:GENLP", "SEM:GENCM", "SEM:GENGAR"], shape: 0 },
      { lineId: "SEM:A", headsign: "Fontaine, La Poya", stopIds: ["SEM:GENGAR", "SEM:GENCM", "SEM:GENLP"], shape: 1 },
    ]);
  });

  it("keeps the GTFS track of tram trips only, without duplicate points", () => {
    expect(schedule.shapes[0]).toEqual([
      [5.67249, 45.19691],
      [5.6804, 45.1937],
      [5.7145, 45.1914],
    ]);
    expect(schedule.shapes).toHaveLength(2);
  });

  it("measures each stop along the track, in meters", () => {
    const [first, middle, last] = schedule.patterns[0]!.stopDistances;
    const lengths = cumulativeDistances(schedule.shapes[0]!);
    expect(first).toBe(0);
    expect(middle).toBe(Math.round(lengths[1]!));
    expect(last).toBe(Math.round(lengths[2]!));
  });

  it("draws a trip without a GTFS shape straight from platform to platform", () => {
    expect(schedule.shapes[1]).toEqual([
      [5.7145, 45.1914],
      [5.6804, 45.1937],
      [5.67249, 45.19691],
    ]);
  });

  it("sorts trips by start time", () => {
    const starts = schedule.trips.map((t) => t.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("honours removals from calendar_dates", () => {
    // 2026-11-11: WEEK is removed; only the night trip of the 10th remains.
    const holiday = buildSchedule(files, "2026-11-11", TRAMS);
    expect(holiday.trips.map((t) => t.id)).toEqual(["SEM:104"]);
  });

  it("builds the schedule of other networks from their GTFS network_id", () => {
    const chrono = buildSchedule(files, "2026-11-06", new Set(["CHRONO"]));
    expect(chrono.trips.map((t) => t.id)).toEqual(["SEM:200"]);
    expect(chrono.patterns[0]).toMatchObject({ lineId: "SEM:C1", stopIds: ["SEM:GENGAR", "SEM:GENCM"] });
  });
});
