/** What a shared link opens on the map: a stop panel, a line panel or a followed vehicle. */
export interface SharedSelection {
  kind: "stop" | "line" | "vehicle";
  /** Stop id, line id, or vehicle key (see vehicleKey). */
  id: string;
}

/** A vehicle key: trip id, "@", start in Unix seconds ("SEM:32165104@1793919600"). */
const VEHICLE_KEY = /^[A-Z0-9]{2,5}:[0-9A-Za-z_-]{1,64}@\d{1,12}$/;

interface Identified {
  id: string;
}

/**
 * The selection a link's query string asks for (`?stop=SEM:GENCHAVANT`, `?line=SEM:A`,
 * `?vehicle=SEM:32165104@1793919600`), or null. Links come from anywhere: only ids of the current
 * network are kept. A vehicle key is only checked for its shape: whether that trip runs is known
 * once the schedules are loaded. A stop wins over a line, a line over a vehicle.
 */
export function parseSharedSelection(
  search: string,
  network: { stops: readonly Identified[]; lines: readonly Identified[] },
): SharedSelection | null {
  const params = new URLSearchParams(search);
  const stopId = params.get("stop");
  if (stopId && network.stops.some((stop) => stop.id === stopId)) return { kind: "stop", id: stopId };
  const lineId = params.get("line");
  if (lineId && network.lines.some((line) => line.id === lineId)) return { kind: "line", id: lineId };
  const vehicle = params.get("vehicle");
  if (vehicle && VEHICLE_KEY.test(vehicle)) return { kind: "vehicle", id: vehicle };
  return null;
}

/** The query string of a link to `selection`, "" for the bare map. */
export function sharedSelectionSearch(selection: SharedSelection | null): string {
  if (!selection) return "";
  return `?${new URLSearchParams({ [selection.kind]: selection.id })}`;
}
