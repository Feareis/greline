"use client";

import { fr } from "@greline/i18n";
import { colors, radii } from "@greline/theme";
import type { SchematicMap, TramNetwork } from "@greline/types";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { StationPanel } from "./station-panel";
import { TramMap } from "./tram-map";

// MapLibre is heavy: it is only downloaded when the map view is shown, and never on the server.
const GeoMap = dynamic(() => import("./geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <p className="flex h-full items-center justify-center" style={{ color: colors.textMuted }}>
      {fr.geoMap.loading}
    </p>
  ),
});

type View = "plan" | "map";
const VIEWS: readonly View[] = ["plan", "map"];

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div
      role="group"
      aria-label={fr.views.label}
      className="absolute top-3 left-3 z-10 flex p-1 shadow-lg"
      style={{ background: colors.surface, borderRadius: radii.pill }}
    >
      {VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => onChange(option)}
          className="px-4 py-1.5 text-sm font-medium focus-visible:outline-2"
          style={{
            borderRadius: radii.pill,
            background: view === option ? colors.accent : "transparent",
            color: view === option ? colors.background : colors.text,
          }}
        >
          {option === "plan" ? fr.views.plan : fr.views.map}
        </button>
      ))}
    </div>
  );
}

interface NetworkViewsProps {
  network: TramNetwork;
  schematic: SchematicMap;
}

/**
 * Plan / map switch. The view lives in the URL (?view=map) so it can be shared; the selected
 * station lives here, above both views, so the single station panel survives a change of view.
 */
export function NetworkViews({ network, schematic }: NetworkViewsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: View = searchParams.get("view") === "map" ? "map" : "plan";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closePanel = useCallback(() => setSelectedId(null), []);

  const changeView = (next: View) => {
    const params = new URLSearchParams(searchParams);
    if (next === "map") params.set("view", "map");
    else params.delete("view");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const selectedStop = useMemo(() => network.stops.find((s) => s.id === selectedId), [network.stops, selectedId]);
  const selectedLines = useMemo(
    () => (selectedId ? network.lines.filter((line) => line.stopIds.includes(selectedId)) : []),
    [network.lines, selectedId],
  );

  return (
    <div className="relative h-full w-full">
      <ViewToggle view={view} onChange={changeView} />
      {view === "map" ? (
        <GeoMap network={network} selectedId={selectedId} onSelect={setSelectedId} />
      ) : (
        <TramMap map={schematic} network={network} selectedId={selectedId} onSelect={setSelectedId} />
      )}
      {selectedStop && <StationPanel stop={selectedStop} lines={selectedLines} onClose={closePanel} />}
    </div>
  );
}
