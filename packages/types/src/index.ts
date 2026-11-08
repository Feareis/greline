/** Transport mode of a line. */
export type LineMode = "tram" | "bus";

/** The networks shown by Greline, in display order. Chrono includes the periurban Chrono lines. */
export const NETWORK_IDS = ["tram", "chrono", "proximo"] as const;
export type NetworkId = (typeof NETWORK_IDS)[number];

/** A public transport line (e.g. tram A). */
export interface Line {
  id: string;
  shortName: string;
  longName: string;
  mode: LineMode;
  network: NetworkId;
  /** Hex color without "#", as provided by the M API. */
  color: string;
  textColor: string;
}

/** A stop (cluster of stop points sharing the same name). */
export interface Stop {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
}

/** A geographic position, GeoJSON order: longitude first, then latitude (degrees). */
export type LonLat = [lon: number, lat: number];

/** The stops of a line in one direction of travel, as numbered by the M API ("0", "1"). */
export interface LineDirection {
  id: string;
  /** Stop ids in travel order. */
  stopIds: string[];
}

/** A line together with the stops of its canonical path (occasional variants excluded). */
export interface NetworkLine extends Line {
  /** Stop ids in travel order, from one terminus to the other. */
  stopIds: string[];
  /** Stop order of each direction: tells which direction goes from one stop to another. */
  directions: LineDirection[];
  /** Official track geometry: one polyline per part (a branch or a disconnected section). */
  shape: LonLat[][];
}

/** The tram network as exposed by our API: lines and every stop they serve. */
export interface TransitNetwork {
  lines: NetworkLine[];
  stops: Stop[];
}

/** The ordered stops served by a group of trips (one line, one direction, one variant). */
export interface TransitPattern {
  lineId: string;
  headsign: string;
  /** Station ids (cluster codes), in travel order. */
  stopIds: string[];
  /** Index in TransitSchedule.shapes: the track these trips run on. */
  shape: number;
  /** Meters along the shape of each stop of `stopIds`, never decreasing. */
  stopDistances: number[];
}

/**
 * One scheduled tram trip. Departure at stop i of its pattern = start + offsets[i], in Unix
 * seconds. `id` matches the realtime trip ids ("SEM:32135884"); a trip running on two
 * consecutive service days appears twice (different `start`).
 */
export interface TransitTrip {
  id: string;
  /** Index in TransitSchedule.patterns. */
  pattern: number;
  start: number;
  offsets: number[];
}

/** Every tram trip running during a service day, including those of the previous day past midnight. */
export interface TransitSchedule {
  /** "YYYY-MM-DD". */
  serviceDate: string;
  /** Track geometries, in travel direction, shared by the patterns. */
  shapes: LonLat[][];
  patterns: TransitPattern[];
  trips: TransitTrip[];
}

/** Severity of an official disruption: line cut, service modified (works, detour), or information. */
export type DisruptionSeverity = "interrupted" | "disrupted" | "info";

/** An official disruption of one of our lines, as exposed by our API. */
export interface Disruption {
  id: string;
  lineId: string;
  severity: DisruptionSeverity;
  title: string;
  description: string;
  /** ISO 8601 instants. */
  start: string;
  end: string;
  /** Affected stretch of the line when the text names its two ends; null means the whole line. */
  stretch: LonLat[] | null;
}

/** Current weather in Grenoble, as exposed by our API. */
export interface Weather {
  /** Degrees Celsius. */
  temperature: number;
  apparentTemperature: number;
  /** WMO weather code. */
  weatherCode: number;
  isDay: boolean;
  /** km/h. */
  windSpeed: number;
  /** Local time in Grenoble, "HH:MM". */
  sunrise: string;
  sunset: string;
}

/** Current air quality in Grenoble, as exposed by our API. */
export interface AirQuality {
  /** European air quality index (0 = clean; above 100 = extremely poor). */
  index: number;
}

/** A single upcoming departure at a stop. */
export interface Departure {
  lineId: string;
  stopId: string;
  /** Direction of travel, as in NetworkLine.directions ("0", "1"). */
  direction: string;
  headsign: string;
  /** ISO 8601 date-time. */
  departureTime: string;
  realtime: boolean;
}

/** One end of an itinerary search: a stop, or a position (the user's). */
export type ItineraryEnd = { kind: "stop"; stopId: string } | { kind: "position"; lat: number; lon: number };

/** One ride of an itinerary, on one line without changing vehicle. */
export interface ItineraryRide {
  /** Line as the M planner names and colors it: possibly a line Greline does not draw. */
  shortName: string;
  /** Hex colors without "#". */
  color: string;
  textColor: string;
  headsign: string;
  /** Stop names, without their city ("Chavant"). */
  from: string;
  to: string;
  /** ISO 8601 instants. */
  departureTime: string;
  arrivalTime: string;
  realtime: boolean;
}

/** A way from one place to another found by the M planner: rides, with walks before, between and after. */
export interface Itinerary {
  /** ISO 8601 instants, walks included. */
  departureTime: string;
  arrivalTime: string;
  walkSeconds: number;
  /** Empty when walking is the best way. */
  rides: ItineraryRide[];
}
