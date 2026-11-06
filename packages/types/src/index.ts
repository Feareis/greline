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

/** A single upcoming departure at a stop. */
export interface Departure {
  lineId: string;
  stopId: string;
  headsign: string;
  /** ISO 8601 date-time. */
  departureTime: string;
  realtime: boolean;
}
