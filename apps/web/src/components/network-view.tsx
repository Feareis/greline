"use client";

import { useDisruptions, useNow } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { isOngoing, parseSharedSelection, type SharedSelection, sharedSelectionSearch, startsLaterToday } from "@greline/services";
import { useLinkSearch } from "@/lib/link-search";
import { useNetworkFilter } from "@/lib/network-filter";
import { useFavorites, useTrip } from "@/lib/personal";
import { colors } from "@/lib/theme-tokens";
import type { Disruption, NetworkId, TransitNetwork } from "@greline/types";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { UserLocation } from "./locate-button";
import { StationPanel } from "./station-panel";
import { DayPanel } from "./day-panel";
import { DisruptionBanner } from "./disruption-banner";
import { LinePanel } from "./line-panel";
import { MyStopsPanel } from "./my-stops-panel";
import { TopBar } from "./top-bar";
import { NetworkSummary } from "./network-summary";

// MapLibre is heavy and needs the browser: it is loaded on the client only.
const GeoMap = dynamic(() => import("./geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <p className="flex h-full items-center justify-center" style={{ color: colors.textMuted }}>
      {fr.geoMap.loading}
    </p>
  ),
});

/** Disruptions have a clock of their own: refreshed every minute, enough for "until 19:00". */
const DISRUPTIONS_CLOCK_MS = 60_000;

/** Official disruptions of the shown networks, split the way the map, banner and panels show them. */
function useShownDisruptions(network: TransitNetwork, networks: readonly NetworkId[]) {
  const { data: disruptions } = useDisruptions();
  const now = useNow(DISRUPTIONS_CLOCK_MS);
  const linesById = useMemo(() => new Map(network.lines.map((line) => [line.id, line])), [network.lines]);
  return useMemo(() => {
    // Every network's, for the panel of a line the filter hides.
    const all = (disruptions ?? []).filter((d) => linesById.has(d.lineId));
    const shown = all.filter((d) => networks.includes(linesById.get(d.lineId)!.network));
    const serious = (d: Disruption) => d.severity !== "info";
    const ongoing = shown.filter((d) => isOngoing(d, now));
    return {
      now,
      linesById,
      all,
      ongoing,
      seriousOngoing: ongoing.filter(serious),
      seriousUpcoming: shown.filter((d) => serious(d) && startsLaterToday(d, now)),
    };
  }, [disruptions, linesById, networks, now]);
}

/** A stop or a line picked from a list is also brought into view; `at` tells two requests apart. */
export interface MapFocus extends SharedSelection {
  at: number;
}

/**
 * The open stop or line. It lives in the address bar (`?stop=`, `?line=`): a copied URL opens
 * the same panel.
 */
function useSelection(network: TransitNetwork) {
  const [linkSearch, setLinkSearch] = useLinkSearch();
  const selection = useMemo(() => parseSharedSelection(linkSearch, network), [linkSearch, network]);
  const select = useCallback((next: SharedSelection | null) => setLinkSearch(sharedSelectionSearch(next)), [setLinkSearch]);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const show = useCallback(
    (next: SharedSelection) => {
      select(next);
      setFocus({ ...next, at: Date.now() });
    },
    [select],
  );
  return { selection, select, focus, show };
}

/** The map with its moving vehicles, the network filter and the panel of the selected stop or line. */
export function NetworkView({ network }: { network: TransitNetwork }) {
  const { selection, select, focus, show } = useSelection(network);
  const selectedId = selection?.kind === "stop" ? selection.id : null;
  const selectStop = useCallback((id: string) => select({ kind: "stop", id }), [select]);
  const showStop = (id: string) => show({ kind: "stop", id });
  const showLine = (id: string) => show({ kind: "line", id });
  const closePanel = useCallback(() => select(null), [select]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [networks, setNetworks] = useNetworkFilter();
  // "Locate me" only offers stops drawn on the map.
  const shownStops = useMemo(() => {
    const ids = new Set(network.lines.filter((line) => networks.includes(line.network)).flatMap((line) => line.stopIds));
    return network.stops.filter((stop) => ids.has(stop.id));
  }, [network, networks]);
  const stopsById = useMemo(() => new Map(network.stops.map((stop) => [stop.id, stop])), [network.stops]);
  const { now, linesById, all, ongoing, seriousOngoing, seriousUpcoming } = useShownDisruptions(network, networks);
  const relevantTo = (lineIds: readonly string[]) =>
    all.filter((d) => lineIds.includes(d.lineId) && (isOngoing(d, now) || startsLaterToday(d, now)));
  // "My stops" opens on its own when there is something in it, until the user decides.
  const { favoriteIds } = useFavorites();
  const { trip } = useTrip();
  const hasPersonal = favoriteIds.length > 0 || trip.from !== null || trip.to !== null;
  const [mineChoice, setMineChoice] = useState<boolean | null>(null);
  const mineOpen = selection === null && (mineChoice ?? hasPersonal);
  const toggleMine = () => {
    select(null);
    setMineChoice(!mineOpen);
  };
  const selectedStop = selectedId ? stopsById.get(selectedId) : undefined;
  const selectedLine = selection?.kind === "line" ? network.lines.find((line) => line.id === selection.id) : undefined;
  const selectedLines = useMemo(
    () => (selectedId ? network.lines.filter((line) => line.stopIds.includes(selectedId)) : []),
    [network.lines, selectedId],
  );

  return (
    <div className="relative h-full w-full">
      <GeoMap
        network={network}
        networks={networks}
        disrupted={seriousOngoing}
        focus={focus}
        selectedId={selectedId}
        selectedLineId={selectedLine?.id ?? null}
        onSelect={selectStop}
        userLocation={userLocation}
      />
      <TopBar
        network={network}
        stops={shownStops}
        onSearchPick={(result) => (result.kind === "line" ? showLine(result.line.id) : showStop(result.stop.id))}
        onSelect={selectStop}
        onLocated={setUserLocation}
        mineOpen={mineOpen}
        onToggleMine={toggleMine}
      />
      <NetworkSummary lines={network.lines} networks={networks} onChange={setNetworks} onShowLine={showLine} />
      <DisruptionBanner ongoing={seriousOngoing} upcoming={seriousUpcoming} linesById={linesById} now={now} />
      <DayPanel networks={networks} ongoingSeverities={ongoing.map((d) => d.severity)} />
      {mineOpen && <MyStopsPanel network={network} onShowStop={showStop} onClose={() => setMineChoice(false)} />}
      {selectedStop && (
        <StationPanel
          stop={selectedStop}
          lines={selectedLines}
          disruptions={relevantTo(selectedLines.map((line) => line.id))}
          linesById={linesById}
          now={now}
          onShowLine={showLine}
          onClose={closePanel}
        />
      )}
      {selectedLine && (
        <LinePanel
          line={selectedLine}
          stopsById={stopsById}
          disruptions={relevantTo([selectedLine.id])}
          linesById={linesById}
          now={now}
          onShowStop={showStop}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
