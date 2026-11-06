export type MoonPhase =
  | "new"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "full"
  | "waningGibbous"
  | "lastQuarter"
  | "waningCrescent";

const PHASES: readonly MoonPhase[] = [
  "new",
  "waxingCrescent",
  "firstQuarter",
  "waxingGibbous",
  "full",
  "waningGibbous",
  "lastQuarter",
  "waningCrescent",
];

/** Mean length of a lunation, in days. */
const SYNODIC_MONTH_DAYS = 29.530588853;
/** A reference new moon: 2000-01-06 18:14 UTC. */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

export interface MoonState {
  phase: MoonPhase;
  /** Lit fraction of the disc, 0 (new) to 1 (full). */
  illumination: number;
}

/**
 * Moon phase at an instant, from the mean lunation. ponytail: ignores the orbit's
 * eccentricity, so phase changes can be off by ~half a day; fine for a "moon tonight" badge.
 */
export function moonState(date: Date): MoonState {
  const days = (date.getTime() - REFERENCE_NEW_MOON_MS) / DAY_MS;
  const age = ((days % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const fraction = age / SYNODIC_MONTH_DAYS;
  // Eight phases centred on their exact moment: "new" covers the last and first sixteenth.
  const phase = PHASES[Math.round(fraction * 8) % 8]!;
  return { phase, illumination: (1 - Math.cos(2 * Math.PI * fraction)) / 2 };
}
