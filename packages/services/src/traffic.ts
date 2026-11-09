import type { DisruptionSeverity } from "@greline/types";
import type { VehiclePosition } from "./vehicles";

/** A tram later than this is shown as late (red outline) and counted as delayed. */
export const LATE_THRESHOLD_SECONDS = 120;

/** Running ahead of schedule by more than this is worth telling: the vehicle may leave early. */
const EARLY_THRESHOLD_SECONDS = 60;

export type Punctuality = { kind: "unknown" } | { kind: "onTime" } | { kind: "late" | "early"; minutes: number };

/** How a vehicle keeps to its schedule, from its realtime delay (undefined without realtime data). */
export function punctuality(delaySeconds: number | undefined): Punctuality {
  if (delaySeconds === undefined) return { kind: "unknown" };
  if (delaySeconds > LATE_THRESHOLD_SECONDS) return { kind: "late", minutes: Math.round(delaySeconds / 60) };
  if (delaySeconds < -EARLY_THRESHOLD_SECONDS) return { kind: "early", minutes: Math.round(-delaySeconds / 60) };
  return { kind: "onTime" };
}

export type TrafficLevel = "smooth" | "someDelays" | "disrupted";

/** Share of running trams that may be late before the network is "some delays" / "disrupted". */
const SOME_DELAYS_SHARE = 0.1;
const DISRUPTED_SHARE = 0.3;

export interface FleetSummary {
  running: number;
  /** Running trams per line id. */
  byLine: Record<string, number>;
  /** Late trams per line id; lines without any are left out. */
  lateByLine: Record<string, number>;
  late: number;
  /** Mean delay of the late trams, in seconds (0 when none is late). */
  averageLateSeconds: number;
  level: TrafficLevel;
}

/** What the running trams say about the network right now. */
export function fleetSummary(vehicles: readonly VehiclePosition[]): FleetSummary {
  const byLine: Record<string, number> = {};
  const lateByLine: Record<string, number> = {};
  let late = 0;
  let lateSeconds = 0;
  for (const vehicle of vehicles) {
    byLine[vehicle.lineId] = (byLine[vehicle.lineId] ?? 0) + 1;
    if (vehicle.delaySeconds <= LATE_THRESHOLD_SECONDS) continue;
    late++;
    lateByLine[vehicle.lineId] = (lateByLine[vehicle.lineId] ?? 0) + 1;
    lateSeconds += vehicle.delaySeconds;
  }
  const share = vehicles.length > 0 ? late / vehicles.length : 0;
  const level: TrafficLevel = share >= DISRUPTED_SHARE ? "disrupted" : share >= SOME_DELAYS_SHARE ? "someDelays" : "smooth";
  return { running: vehicles.length, byLine, lateByLine, late, averageLateSeconds: late > 0 ? lateSeconds / late : 0, level };
}

const LEVEL_RANK: Readonly<Record<TrafficLevel, number>> = { smooth: 0, someDelays: 1, disrupted: 2 };
const LEVEL_OF_SEVERITY: Readonly<Record<DisruptionSeverity, TrafficLevel>> = {
  interrupted: "disrupted",
  disrupted: "someDelays",
  info: "smooth",
};

/** The worse of the level measured from delays and the level of the ongoing official disruptions. */
export function trafficLevel(measured: TrafficLevel, ongoing: readonly DisruptionSeverity[]): TrafficLevel {
  return ongoing.map((severity) => LEVEL_OF_SEVERITY[severity]).reduce((worst, level) => (LEVEL_RANK[level] > LEVEL_RANK[worst] ? level : worst), measured);
}
