/**
 * Whole minutes between `now` and a departure time (never negative).
 * A departure in less than one minute returns 0 ("now").
 */
export function minutesUntil(departureTime: string | Date, now: Date = new Date()): number {
  const target = typeof departureTime === "string" ? new Date(departureTime) : departureTime;
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 60_000));
}

/**
 * Turns a GTFS time (seconds counted from the service day origin, possibly beyond 24:00) into
 * an instant. GTFS places that origin at "noon minus 12 h" local time, not midnight: the two
 * differ by one hour on daylight saving days, so `serviceDay` must come from the data source
 * (the M API provides it in Unix seconds) rather than be recomputed from the calendar date.
 */
export function serviceTimeToDate(serviceDay: number, secondsSinceServiceDay: number): Date {
  return new Date((serviceDay + secondsSinceServiceDay) * 1000);
}

const PARIS_CLOCK = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "HH:MM" in Grenoble's time zone, independent of the server or browser time zone. */
export function formatClockTime(date: Date): string {
  return PARIS_CLOCK.format(date);
}
