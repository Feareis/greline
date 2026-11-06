"use client";

import { fr } from "@greline/i18n";
import { colors } from "@/lib/theme-tokens";
import type { TramNetwork } from "@greline/types";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { UserLocation } from "./locate-button";
import { StationPanel } from "./station-panel";
import { TopBar } from "./top-bar";
import { TramLegend } from "./tram-vehicles";

// MapLibre is heavy and needs the browser: it is loaded on the client only.
const GeoMap = dynamic(() => import("./geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <p className="flex h-full items-center justify-center" style={{ color: colors.textMuted }}>
      {fr.geoMap.loading}
    </p>
  ),
});

/** The tram map with its moving trams, and the panel of the selected station. */
export function NetworkView({ network }: { network: TramNetwork }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const closePanel = useCallback(() => setSelectedId(null), []);
  const selectedStop = useMemo(() => network.stops.find((s) => s.id === selectedId), [network.stops, selectedId]);
  const selectedLines = useMemo(
    () => (selectedId ? network.lines.filter((line) => line.stopIds.includes(selectedId)) : []),
    [network.lines, selectedId],
  );

  return (
    <div className="relative h-full w-full">
      <GeoMap network={network} selectedId={selectedId} onSelect={setSelectedId} userLocation={userLocation} />
      <TopBar stops={network.stops} onSelect={setSelectedId} onLocated={setUserLocation} />
      <TramLegend />
      {selectedStop && <StationPanel stop={selectedStop} lines={selectedLines} onClose={closePanel} />}
    </div>
  );
}
