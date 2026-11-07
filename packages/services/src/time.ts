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

const PARIS_OFFSET = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "longOffset" });
const PARIS_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** Offset of Paris time from UTC at a given instant, in minutes (60 in winter, 120 in summer). */
function parisOffsetMinutes(instant: Date): number {
  const name = PARIS_OFFSET.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name);
  if (!match) throw new Error(`Unexpected time zone offset format: "${name}"`);
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

/**
 * Unix seconds of the GTFS service day origin of a calendar date ("YYYY-MM-DD") in Grenoble:
 * noon local time minus 12 h. GTFS times (possibly beyond 24:00) count from that instant.
 */
export function serviceDayOrigin(serviceDate: string): number {
  const [year, month, day] = serviceDate.split("-").map(Number) as [number, number, number];
  // Clocks change at night, so the offset at 12:00 UTC is the offset at local noon.
  const noonUtc = Date.UTC(year, month - 1, day, 12);
  const localNoon = noonUtc - parisOffsetMinutes(new Date(noonUtc)) * 60_000;
  return (localNoon - 12 * 3_600_000) / 1000;
}

/** Calendar date ("YYYY-MM-DD") in Grenoble at a given instant. */
export function parisDate(instant: Date): string {
  return PARIS_DATE.format(instant);
}

/**
 * The instant of a Grenoble wall-clock time ("2026-11-07", "12:00"). The offset is taken at the
 * naive UTC reading, which only errs inside the skipped or repeated hour of a clock change.
 */
export function parisDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  const naive = Date.UTC(year, month - 1, day, hours, minutes);
  return new Date(naive - parisOffsetMinutes(new Date(naive)) * 60_000);
}
