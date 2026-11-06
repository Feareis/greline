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

/** A point in schematic map units (SVG user space, y pointing down). */
export interface SchematicPoint {
  x: number;
  y: number;
}

/** A station placed on the schematic map. */
export interface SchematicStation {
  stopId: string;
  position: SchematicPoint;
  /** Ids of the lines serving the station; two or more means a transfer. */
  lineIds: string[];
}

/** The drawn path of one line, made of 0/45/90 degree segments. */
export interface SchematicPath {
  lineId: string;
  points: SchematicPoint[];
}

/** Everything needed to draw the schematic map, independent of any renderer. */
export interface SchematicMap {
  width: number;
  height: number;
  stations: SchematicStation[];
  paths: SchematicPath[];
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
