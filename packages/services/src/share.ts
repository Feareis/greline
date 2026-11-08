/** What a shared link opens on the map: a stop panel or a line panel. */
export interface SharedSelection {
  kind: "stop" | "line";
  id: string;
}

interface Identified {
  id: string;
}

/**
 * The selection a link's query string asks for (`?stop=SEM:GENCHAVANT`, `?line=SEM:A`), or null.
 * Links come from anywhere: only ids of the current network are kept. A stop wins over a line.
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
  return null;
}

/** The query string of a link to `selection`, "" for the bare map. */
export function sharedSelectionSearch(selection: SharedSelection | null): string {
  if (!selection) return "";
  return `?${new URLSearchParams({ [selection.kind]: selection.id })}`;
}
