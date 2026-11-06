import type { Departure, Line } from "@greline/types";
import { formatClockTime, minutesUntil } from "./time";

/** The departure fields of a stop time, in GTFS seconds since the service day origin. */
export interface StopTimeDeparture {
  realtime: boolean;
  scheduledDeparture: number;
  realtimeDeparture: number;
}

/** Realtime estimate when the vehicle reports one, scheduled time otherwise. */
export function departureSeconds(stopTime: StopTimeDeparture): number {
  return stopTime.realtime ? stopTime.realtimeDeparture : stopTime.scheduledDeparture;
}

export type DepartureCountdown =
  | { kind: "approaching" }
  | { kind: "minutes"; minutes: number }
  | { kind: "clock"; time: string };

const CLOCK_THRESHOLD_MIN = 60;

/** What a rider should read: "approaching", a few minutes, or the exact time past one hour. */
export function departureCountdown(departureTime: string | Date, now: Date): DepartureCountdown {
  const minutes = minutesUntil(departureTime, now);
  if (minutes < 1) return { kind: "approaching" };
  if (minutes < CLOCK_THRESHOLD_MIN) return { kind: "minutes", minutes };
  return { kind: "clock", time: formatClockTime(new Date(departureTime)) };
}

export interface DirectionDepartures {
  headsign: string;
  /** Chronological order. */
  departures: Departure[];
}

export interface LineDepartures {
  line: Line;
  /** Ordered by each direction's next departure. */
  directions: DirectionDepartures[];
}

const departureMs = (departure: Departure): number => Date.parse(departure.departureTime);

/**
 * Groups departures by line (in the order of `lines`), then by direction. Departures of lines
 * missing from `lines` are dropped, and so are lines without any departure.
 */
export function groupDepartures(departures: readonly Departure[], lines: readonly Line[]): LineDepartures[] {
  const sorted = [...departures].sort((a, b) => departureMs(a) - departureMs(b));
  return lines.flatMap((line) => {
    const byHeadsign = new Map<string, Departure[]>();
    for (const departure of sorted) {
      if (departure.lineId !== line.id) continue;
      byHeadsign.set(departure.headsign, [...(byHeadsign.get(departure.headsign) ?? []), departure]);
    }
    if (byHeadsign.size === 0) return [];
    // Map keeps insertion order, and departures were inserted chronologically.
    const directions = [...byHeadsign].map(([headsign, list]) => ({ headsign, departures: list }));
    return [{ line, directions }];
  });
}
