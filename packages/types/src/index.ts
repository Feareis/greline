/** Transport mode of a line. */
export type LineMode = "tram" | "bus";

/** A public transport line (e.g. tram A). */
export interface Line {
  id: string;
  shortName: string;
  longName: string;
  mode: LineMode;
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

/** A line together with the stops of its canonical path (occasional variants excluded). */
export interface NetworkLine extends Line {
  /** Stop ids in travel order, from one terminus to the other. */
  stopIds: string[];
  /** Official track geometry: one polyline per part (a branch or a disconnected section). */
  shape: LonLat[][];
}

/** The tram network as exposed by our API: lines and every stop they serve. */
export interface TramNetwork {
  lines: NetworkLine[];
  stops: Stop[];
}

/** The ordered stops served by a group of trips (one line, one direction, one variant). */
export interface TramPattern {
  lineId: string;
  headsign: string;
  /** Station ids (cluster codes), in travel order. */
  stopIds: string[];
  /** Index in TramSchedule.shapes: the track these trips run on. */
  shape: number;
  /** Meters along the shape of each stop of `stopIds`, never decreasing. */
  stopDistances: number[];
}

/**
 * One scheduled tram trip. Departure at stop i of its pattern = start + offsets[i], in Unix
 * seconds. `id` matches the realtime trip ids ("SEM:32135884"); a trip running on two
 * consecutive service days appears twice (different `start`).
 */
export interface TramTrip {
  id: string;
  /** Index in TramSchedule.patterns. */
  pattern: number;
  start: number;
  offsets: number[];
}

/** Every tram trip running during a service day, including those of the previous day past midnight. */
export interface TramSchedule {
  /** "YYYY-MM-DD". */
  serviceDate: string;
  /** Track geometries, in travel direction, shared by the patterns. */
  shapes: LonLat[][];
  patterns: TramPattern[];
  trips: TramTrip[];
}

/** A single upcoming departure at a stop. */
export interface Departure {
  lineId: string;
  stopId: string;
  headsign: string;
  /** ISO 8601 date-time. */
  departureTime: string;
  realtime: boolean;
}
