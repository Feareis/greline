import type { Disruption } from "@greline/types";
import { formatClockTime, parisDate } from "./time";

/** In effect at `now`. */
export const isOngoing = (disruption: Disruption, now: Date): boolean =>
  new Date(disruption.start) <= now && now < new Date(disruption.end);

/**
 * Whether the map draws the disruption on the line: a located stretch, or a whole line that is
 * cut. A whole line merely "disrupted" (a moved stop, a detour somewhere) is left to the texts:
 * drawn end to end, it would outweigh the network itself.
 */
export const isDrawnOnMap = (disruption: Disruption): boolean =>
  disruption.stretch !== null || disruption.severity === "interrupted";

/** Not started yet, but starts today (Grenoble calendar day). */
export function startsLaterToday(disruption: Disruption, now: Date): boolean {
  const start = new Date(disruption.start);
  return start > now && parisDate(start) === parisDate(now);
}

/** How to word a disruption's period; times are "HH:MM", dates "DD/MM", in Grenoble time. */
export type DisruptionPeriod =
  | { kind: "untilTime"; end: string }
  | { kind: "untilDate"; end: string }
  | { kind: "fromTo"; start: string; end: string }
  | { kind: "fromDate"; start: string };

const PARIS_DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" });

/** "until 19:00" when it ends today, "until 21/11" otherwise; "from 12:00 to 19:00" before it starts. */
export function disruptionPeriod(disruption: Disruption, now: Date): DisruptionPeriod {
  const start = new Date(disruption.start);
  const end = new Date(disruption.end);
  const today = parisDate(now);
  const endsToday = parisDate(end) === today;
  if (start > now) {
    return parisDate(start) === today && endsToday
      ? { kind: "fromTo", start: formatClockTime(start), end: formatClockTime(end) }
      : { kind: "fromDate", start: PARIS_DAY_MONTH.format(start) };
  }
  return endsToday ? { kind: "untilTime", end: formatClockTime(end) } : { kind: "untilDate", end: PARIS_DAY_MONTH.format(end) };
}
