/** What a shared link opens on the map. */
export type SharedSelection = { kind: "stop"; id: string };

/**
 * The selection a link's query string asks for (`?stop=SEM:GENCHAVANT`), or null. Links come
 * from anywhere: only ids of the current network are kept.
 */
export function parseSharedSelection(search: string, network: { stops: readonly { id: string }[] }): SharedSelection | null {
  const stopId = new URLSearchParams(search).get("stop");
  if (stopId && network.stops.some((stop) => stop.id === stopId)) return { kind: "stop", id: stopId };
  return null;
}

/** The query string of a link to `selection`, "" for the bare map. */
export function sharedSelectionSearch(selection: SharedSelection | null): string {
  if (!selection) return "";
  return `?${new URLSearchParams({ [selection.kind]: selection.id })}`;
}
