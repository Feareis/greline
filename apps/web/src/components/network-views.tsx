"use client";

import type { SchematicMap, TramNetwork } from "@greline/types";
import { useCallback, useMemo, useState } from "react";
import { StationPanel } from "./station-panel";
import { TramMap } from "./tram-map";

interface NetworkViewsProps {
  network: TramNetwork;
  schematic: SchematicMap;
}

/** Owns the selected station, so the single station panel survives a change of view. */
export function NetworkViews({ network, schematic }: NetworkViewsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closePanel = useCallback(() => setSelectedId(null), []);

  const selectedStop = useMemo(() => network.stops.find((s) => s.id === selectedId), [network.stops, selectedId]);
  const selectedLines = useMemo(
    () => (selectedId ? network.lines.filter((line) => line.stopIds.includes(selectedId)) : []),
    [network.lines, selectedId],
  );

  return (
    <div className="relative h-full w-full">
      <TramMap map={schematic} network={network} selectedId={selectedId} onSelect={setSelectedId} />
      {selectedStop && <StationPanel stop={selectedStop} lines={selectedLines} onClose={closePanel} />}
    </div>
  );
}
