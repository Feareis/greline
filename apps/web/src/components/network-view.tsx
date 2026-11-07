"use client";

import { useDisruptions, useNow } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { isOngoing, parseSharedSelection, sharedSelectionSearch, startsLaterToday } from "@greline/services";
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
    const shown = (disruptions ?? []).filter((d) => {
      const line = linesById.get(d.lineId);
      return line !== undefined && networks.includes(line.network);
    });
    const serious = (d: Disruption) => d.severity !== "info";
    const ongoing = shown.filter((d) => isOngoing(d, now));
    return {
      now,
      linesById,
      shown,
      ongoing,
      seriousOngoing: ongoing.filter(serious),
      seriousUpcoming: shown.filter((d) => serious(d) && startsLaterToday(d, now)),
    };
  }, [disruptions, linesById, networks, now]);
}

/** The map with its moving vehicles, the network filter and the panel of the selected stop. */
export function NetworkView({ network }: { network: TransitNetwork }) {
  // The open stop lives in the address bar (`?stop=`): a copied URL opens the same stop.
  const [linkSearch, setLinkSearch] = useLinkSearch();
  const selectedId = useMemo(() => parseSharedSelection(linkSearch, network)?.id ?? null, [linkSearch, network]);
  const setSelectedId = useCallback(
    (stopId: string | null) => setLinkSearch(sharedSelectionSearch(stopId ? { kind: "stop", id: stopId } : null)),
    [setLinkSearch],
  );
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [networks, setNetworks] = useNetworkFilter();
  // "Locate me" only offers stops drawn on the map.
  const shownStops = useMemo(() => {
    const ids = new Set(network.lines.filter((line) => networks.includes(line.network)).flatMap((line) => line.stopIds));
    return network.stops.filter((stop) => ids.has(stop.id));
  }, [network, networks]);
  const { now, linesById, shown, ongoing, seriousOngoing, seriousUpcoming } = useShownDisruptions(network, networks);
  const closePanel = useCallback(() => setSelectedId(null), [setSelectedId]);
  // "My stops" opens on its own when there is something in it, until the user decides.
  const { favoriteIds } = useFavorites();
  const { trip } = useTrip();
  const hasPersonal = favoriteIds.length > 0 || trip.from !== null || trip.to !== null;
  const [mineChoice, setMineChoice] = useState<boolean | null>(null);
  const mineOpen = selectedId === null && (mineChoice ?? hasPersonal);
  const toggleMine = () => {
    setSelectedId(null);
    setMineChoice(!mineOpen);
  };
  // A stop picked from a list is also centered on the map; `at` re-centers on the same stop.
  const [focus, setFocus] = useState<{ stopId: string; at: number } | null>(null);
  const showStop = (stopId: string) => {
    setSelectedId(stopId);
    setFocus({ stopId, at: Date.now() });
  };
  const selectedStop = useMemo(() => network.stops.find((s) => s.id === selectedId), [network.stops, selectedId]);
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
        onSelect={setSelectedId}
        userLocation={userLocation}
      />
      <TopBar
        stops={shownStops}
        onSelect={setSelectedId}
        onLocated={setUserLocation}
        mineOpen={mineOpen}
        onToggleMine={toggleMine}
      />
      <NetworkSummary lines={network.lines} networks={networks} onChange={setNetworks} />
      <DisruptionBanner ongoing={seriousOngoing} upcoming={seriousUpcoming} linesById={linesById} now={now} />
      <DayPanel networks={networks} ongoingSeverities={ongoing.map((d) => d.severity)} />
      {mineOpen && <MyStopsPanel network={network} onShowStop={showStop} onClose={() => setMineChoice(false)} />}
      {selectedStop && (
        <StationPanel
          stop={selectedStop}
          lines={selectedLines}
          disruptions={shown.filter((d) => selectedLines.some((line) => line.id === d.lineId) && (isOngoing(d, now) || startsLaterToday(d, now)))}
          linesById={linesById}
          now={now}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
