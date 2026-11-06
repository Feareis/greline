"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { fr } from "@greline/i18n";
import { colors, toCssColor } from "@greline/theme";
import type { Stop, TramNetwork } from "@greline/types";
import { setWorkerUrl } from "maplibre-gl";
import { useMemo, useState } from "react";
import MapView, { AttributionControl, Layer, type MapEvent, Marker, NavigationControl, Source } from "react-map-gl/maplibre";

// MapLibre 6 derives its worker URL from its own module URL at runtime, which points into the
// Next.js chunks folder once bundled (404). Referencing the worker with a static
// new URL(..., import.meta.url) makes the bundler emit it and gives us its real URL.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

// OpenFreeMap: OpenStreetMap vector tiles, free, no API key (see docs/decisions/0002-map-tiles.md).
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const SELECTED_STATION_ZOOM = 15;

/** Aligns the base map with our design tokens once the style is loaded. */
function applyThemeColors({ target: map }: MapEvent) {
  if (map.getLayer("background")) map.setPaintProperty("background", "background-color", colors.background);
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", colors.surface);
}

function networkBounds(stops: readonly Stop[]): [[number, number], [number, number]] {
  const lons = stops.map((s) => s.lon);
  const lats = stops.map((s) => s.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

interface StationButtonProps {
  stop: Stop;
  transfer: boolean;
  selected: boolean;
  onSelect: (stopId: string) => void;
}

/** Same look as the schematic map: white dot, larger ringed pill for transfers. 24 px hit area. */
function StationButton({ stop, transfer, selected, onSelect }: StationButtonProps) {
  const size = transfer ? 14 : 8;
  return (
    <Marker longitude={stop.lon} latitude={stop.lat} anchor="center">
      <button
        type="button"
        aria-label={stop.name}
        aria-pressed={selected}
        title={stop.name}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(stop.id);
        }}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2"
        style={{ outlineColor: colors.accent }}
      >
        <span
          className="block rounded-full"
          style={{
            width: size,
            height: size,
            background: colors.station,
            border: transfer ? `2px solid ${colors.background}` : undefined,
            boxShadow: selected ? `0 0 0 3px ${colors.accent}` : undefined,
          }}
        />
      </button>
    </Marker>
  );
}

interface GeoMapProps {
  network: TramNetwork;
  selectedId: string | null;
  onSelect: (stopId: string) => void;
}

/** Real geographic map: official track shapes and stations on an OpenStreetMap base. */
export function GeoMap({ network, selectedId, onSelect }: GeoMapProps) {
  const linesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: network.lines.map((line) => ({
        type: "Feature" as const,
        properties: { color: toCssColor(line.color) },
        geometry: { type: "MultiLineString" as const, coordinates: line.shape },
      })),
    }),
    [network.lines],
  );
  const transferIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of network.lines) for (const id of line.stopIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
  }, [network.lines]);

  // Computed once: the map then owns its camera (uncontrolled). A station selected in the plan
  // view is centered on; otherwise the whole network is framed.
  const [initialViewState] = useState(() => {
    const selected = network.stops.find((s) => s.id === selectedId);
    if (selected) return { longitude: selected.lon, latitude: selected.lat, zoom: SELECTED_STATION_ZOOM };
    return { bounds: networkBounds(network.stops), fitBoundsOptions: { padding: 40 } };
  });

  return (
    <div className="h-full w-full" role="region" aria-label={fr.geoMap.ariaLabel}>
      <MapView
        initialViewState={initialViewState}
        mapStyle={MAP_STYLE_URL}
        attributionControl={false}
        onLoad={applyThemeColors}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="tram-lines" type="geojson" data={linesData}>
          <Layer
            id="tram-lines"
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": ["get", "color"], "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 7] }}
          />
        </Source>
        {network.stops.map((stop) => (
          <StationButton
            key={stop.id}
            stop={stop}
            transfer={transferIds.has(stop.id)}
            selected={stop.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        <NavigationControl position="bottom-left" showCompass={false} />
        <AttributionControl compact={false} position="bottom-right" customAttribution={[fr.geoMap.osmCredit, fr.geoMap.dataCredit]} />
      </MapView>
    </div>
  );
}
