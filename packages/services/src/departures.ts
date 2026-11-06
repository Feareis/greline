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
