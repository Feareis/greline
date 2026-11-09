"use client";

import { useDisruptions, useNow, useVehicleTrip } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { isDrawnOnMap, isOngoing, parseSharedSelection, type SharedSelection, sharedSelectionSearch, startsLaterToday } from "@greline/services";
import { useLinkSearch } from "@/lib/link-search";
import { useNetworkFilter, useParkAndRidesShown } from "@/lib/network-filter";
import { colors } from "@/lib/theme-tokens";
import type { Disruption, Line, NetworkId, TransitNetwork } from "@greline/types";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { UserLocation } from "./locate-button";
import { StationPanel } from "./station-panel";
import { DayPanel } from "./day-panel";
import { DisruptionBanner } from "./disruption-banner";
import { LinePanel } from "./line-panel";
import { MoreMenu } from "./more-menu";
import { MyStopsPanel } from "./my-stops-panel";
import { TopBar } from "./top-bar";
import { NetworkSummary } from "./network-summary";
import { ParkAndRidePanel } from "./park-and-ride-panel";
import { type FollowedTrip, VehiclePanel } from "./vehicle-panel";

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
    const seriousOngoing = ongoing.filter(serious);
    return {
      now,
      linesById,
      all,
      ongoing,
      seriousOngoing,
      // On the lines themselves, only what is located or a cut line: the texts carry the rest.
      drawnOnMap: seriousOngoing.filter(isDrawnOnMap),
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

/**
 * The vehicle of `?vehicle=`, looked up in today's schedules, and whether the camera follows it.
 * Picking a vehicle always starts following it; dragging the map stops.
 */
function useFollowedVehicle(vehicleKey: string | null, linesById: ReadonlyMap<string, Line>) {
  const { found, isPending } = useVehicleTrip(vehicleKey);
  const [following, setFollowing] = useState(true);
  const followedTrip = useMemo((): FollowedTrip | null => {
    if (!found) return null;
    const pattern = found.schedule.patterns[found.trip.pattern]!;
    const line = linesById.get(pattern.lineId);
    return line ? { trip: found.trip, pattern, line } : null;
  }, [found, linesById]);
  return { followedTrip, isPending, following, setFollowing };
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
  const [parkAndRidesShown, setParkAndRidesShown] = useParkAndRidesShown();
  // "Locate me" only offers stops drawn on the map.
  const shownStops = useMemo(() => {
    const ids = new Set(network.lines.filter((line) => networks.includes(line.network)).flatMap((line) => line.stopIds));
    return network.stops.filter((stop) => ids.has(stop.id));
  }, [network, networks]);
  const stopsById = useMemo(() => new Map(network.stops.map((stop) => [stop.id, stop])), [network.stops]);
  const { now, linesById, all, ongoing, seriousOngoing, seriousUpcoming, drawnOnMap } = useShownDisruptions(network, networks);
  const vehicleKey = selection?.kind === "vehicle" ? selection.id : null;
  const { followedTrip, isPending: vehiclePending, following, setFollowing } = useFollowedVehicle(vehicleKey, linesById);
  const selectVehicle = (key: string) => {
    select({ kind: "vehicle", id: key });
    setFollowing(true);
  };
  const relevantTo = (lineIds: readonly string[]) =>
    all.filter((d) => lineIds.includes(d.lineId) && (isOngoing(d, now) || startsLaterToday(d, now)));
  // "My stops", like every top bar button, stays closed until asked for: the map comes first.
  const [mineChoice, setMineChoice] = useState(false);
  const mineOpen = selection === null && mineChoice;
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
        disrupted={drawnOnMap}
        focus={focus}
        selectedId={selectedId}
        selectedLineId={selectedLine?.id ?? null}
        onSelect={selectStop}
        userLocation={userLocation}
        showParkAndRides={parkAndRidesShown}
        followed={vehicleKey ? { key: vehicleKey, network: followedTrip?.line.network ?? null, following } : null}
        onSelectVehicle={selectVehicle}
        onFollowLost={() => setFollowing(false)}
      />
      <TopBar
        network={network}
        stops={shownStops}
        onSearchPick={(result) => (result.kind === "line" ? showLine(result.line.id) : showStop(result.stop.id))}
        onSelect={selectStop}
        onLocated={setUserLocation}
        mineOpen={mineOpen}
        onToggleMine={toggleMine}
        center={<DisruptionBanner ongoing={seriousOngoing} upcoming={seriousUpcoming} linesById={linesById} now={now} />}
        phoneMenu={
          <MoreMenu
            ongoing={seriousOngoing}
            upcoming={seriousUpcoming}
            linesById={linesById}
            now={now}
            parkAndRidesShown={parkAndRidesShown}
            onParkAndRidesShownChange={setParkAndRidesShown}
          />
        }
      />
      {/* Left column: the network panel, the P+R one right under it. Both shrink and scroll so the
          column stops above the day panel; above the disruption banner when unfolded on phones.
          Phones hide it while a panel is open: together they would leave no map at all. Their P+R
          panel is in the "⋯" menu. */}
      <div
        className={`absolute top-16 left-3 z-20 flex max-h-[calc(100dvh-17rem)] w-[19rem] max-w-[calc(100vw-1.5rem)] flex-col gap-2 sm:max-h-[calc(100dvh-20rem)] ${selection || mineOpen ? "max-sm:hidden" : ""}`}
      >
        <NetworkSummary lines={network.lines} networks={networks} onChange={setNetworks} onShowLine={showLine} />
        <div className="contents max-sm:hidden">
          <ParkAndRidePanel shown={parkAndRidesShown} onShownChange={setParkAndRidesShown} />
        </div>
      </div>
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
      {vehicleKey && (
        <VehiclePanel
          vehicleKey={vehicleKey}
          followed={followedTrip}
          isPending={vehiclePending}
          stopsById={stopsById}
          following={following}
          onFollow={() => setFollowing(!following)}
          onShowStop={showStop}
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
