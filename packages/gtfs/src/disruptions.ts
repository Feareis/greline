import { cumulativeDistances, locateOnPolyline, parisDateTime, slicePolyline } from "@greline/services";
import type { Disruption, DisruptionSeverity, LonLat, NetworkLine, Stop, TransitNetwork } from "@greline/types";
import { type MEvent, mEventSchema, mEventsSchema } from "@greline/validation";
import { type FetchLike, fetchFromMApi, M_API } from "./fetch-network";

/**
 * M severity level (`nsv_id`) of each of ours, inferred from the published events: 3 is used for
 * "the line does not run between...", 2 for works and detours; 0, 1 and 4 for information.
 */
const SEVERITY_OF_LEVEL: Readonly<Record<number, DisruptionSeverity>> = { 3: "interrupted", 2: "disrupted" };
const SEVERITY_ORDER: readonly DisruptionSeverity[] = ["interrupted", "disrupted", "info"];

/** A stretch end farther than this from the line's shape is not the station we think it is. */
const MAX_STATION_OFFSET_M = 150;

/** "SEM_C1" (event line code) -> "SEM:C1" (our line id). */
export const lineIdOfEventCode = (code: string): string => code.trim().replace("_", ":");

/** "07/11/2026 12:00", Grenoble time -> instant. The format is checked by mEventSchema. */
export function parseEventDate(value: string): Date {
  const [date, time] = value.split(" ") as [string, string];
  const [day, month, year] = date.split("/");
  return parisDateTime(`${year}-${month}-${day}`, time);
}

// The M texts open with the validity period ("\u00e0 partir du ...|jusqu'au ..."), which we show
// from the dates themselves.
const PERIOD_LINE = /^(\u00e0 partir du|jusqu'au)\b/i;

/** The event text without its leading validity period, with plain newlines. */
export function cleanDescription(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && PERIOD_LINE.test(lines[0]!.trim())) lines.shift();
  return lines.join("\n").trim();
}

/** Case, accents, dashes and spacing differ between texts and stop names: compare without them. */
const normalizeName = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const BETWEEN = /entre (?:les (?:stations|arr\u00eats) |la station |l['\u2019]arr\u00eat )?(.+?) et (.+?)(?= en raison|\s*\(|[.,;]|$)/i;

/** The stop of the line named `name`: same name, or the only one whose name starts with it. */
function stopNamed(name: string, lineStops: readonly Stop[]): Stop | undefined {
  const wanted = normalizeName(name);
  const exact = lineStops.find((stop) => normalizeName(stop.name) === wanted);
  if (exact) return exact;
  const prefixed = lineStops.filter((stop) => normalizeName(stop.name).startsWith(wanted));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

/**
 * The stretch of the line between the two stations named in the text ("entre les stations
 * Malherbe et La Poya"), or null when the text names no stretch or names it differently.
 */
export function stretchOf(description: string, line: NetworkLine, stopsById: ReadonlyMap<string, Stop>): LonLat[] | null {
  const match = BETWEEN.exec(description.replace(/\s+/g, " "));
  if (!match) return null;
  const lineStops = line.stopIds.flatMap((id) => stopsById.get(id) ?? []);
  const from = stopNamed(match[1]!, lineStops);
  const to = stopNamed(match[2]!, lineStops);
  if (!from || !to || from === to) return null;
  let best: { stretch: LonLat[]; offset: number } | null = null;
  for (const part of line.shape) {
    const cumulative = cumulativeDistances(part);
    const a = locateOnPolyline([from.lon, from.lat], part, cumulative);
    const b = locateOnPolyline([to.lon, to.lat], part, cumulative);
    const offset = Math.max(a.offset, b.offset);
    if (offset > MAX_STATION_OFFSET_M || (best && offset >= best.offset)) continue;
    best = { stretch: slicePolyline(part, cumulative, a.along, b.along), offset };
  }
  return best?.stretch ?? null;
}

/**
 * Ongoing and upcoming disruptions of our lines, most severe first, then by start. Events of
 * other lines, hidden from transit users, or already over at `now` are left out.
 */
export function toDisruptions(events: readonly MEvent[], network: TransitNetwork, now: Date): Disruption[] {
  const lines = new Map(network.lines.map((line) => [line.id, line]));
  const stops = new Map(network.stops.map((stop) => [stop.id, stop]));
  const disruptions = events.flatMap((event): Disruption[] => {
    const line = lines.get(lineIdOfEventCode(event.listeLigne));
    const end = parseEventDate(event.dateFin);
    if (!event.visibleTC || !line || end <= now) return [];
    const description = cleanDescription(event.description);
    return [
      {
        id: event.code,
        lineId: line.id,
        severity: SEVERITY_OF_LEVEL[event.nsv_id] ?? "info",
        title: event.titre.trim(),
        description,
        start: parseEventDate(event.dateDebut).toISOString(),
        end: end.toISOString(),
        stretch: stretchOf(description, line, stops),
      },
    ];
  });
  return disruptions.sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.start.localeCompare(b.start),
  );
}

export interface Disruptions {
  disruptions: Disruption[];
  /** Events dropped because they did not match the expected shape. */
  invalidEvents: number;
}

/** Disruptions of our network from the M API events feed. One odd event never hides the others. */
export async function fetchDisruptions(network: TransitNetwork, fetchFn: FetchLike = fetch, now: Date = new Date()): Promise<Disruptions> {
  const raw = Object.values(await fetchFromMApi(M_API.events, mEventsSchema, fetchFn));
  const events = raw.flatMap((event) => {
    const parsed = mEventSchema.safeParse(event);
    return parsed.success ? [parsed.data] : [];
  });
  return { disruptions: toDisruptions(events, network, now), invalidEvents: raw.length - events.length };
}
