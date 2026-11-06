/**
 * Whole minutes between `now` and a departure time (never negative).
 * A departure in less than one minute returns 0 ("now").
 */
export function minutesUntil(departureTime: string | Date, now: Date = new Date()): number {
  const target = typeof departureTime === "string" ? new Date(departureTime) : departureTime;
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 60_000));
}
