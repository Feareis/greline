"use client";

import { fr } from "@greline/i18n";
import { useNetworkFilter } from "@/lib/network-filter";
import { colors } from "@/lib/theme-tokens";
import type { TransitNetwork } from "@greline/types";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { UserLocation } from "./locate-button";
import { StationPanel } from "./station-panel";
import { DayPanel } from "./day-panel";
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

/** The map with its moving vehicles, the network filter and the panel of the selected stop. */
export function NetworkView({ network }: { network: TransitNetwork }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [networks, setNetworks] = useNetworkFilter();
  // "Locate me" only offers stops drawn on the map.
  const shownStops = useMemo(() => {
    const ids = new Set(network.lines.filter((line) => networks.includes(line.network)).flatMap((line) => line.stopIds));
    return network.stops.filter((stop) => ids.has(stop.id));
  }, [network, networks]);
  const closePanel = useCallback(() => setSelectedId(null), []);
  const selectedStop = useMemo(() => network.stops.find((s) => s.id === selectedId), [network.stops, selectedId]);
  const selectedLines = useMemo(
    () => (selectedId ? network.lines.filter((line) => line.stopIds.includes(selectedId)) : []),
    [network.lines, selectedId],
  );

  return (
    <div className="relative h-full w-full">
      <GeoMap network={network} networks={networks} selectedId={selectedId} onSelect={setSelectedId} userLocation={userLocation} />
      <TopBar stops={shownStops} onSelect={setSelectedId} onLocated={setUserLocation} />
      <NetworkSummary lines={network.lines} networks={networks} onChange={setNetworks} />
      <DayPanel networks={networks} />
      {selectedStop && <StationPanel stop={selectedStop} lines={selectedLines} onClose={closePanel} />}
    </div>
  );
}
