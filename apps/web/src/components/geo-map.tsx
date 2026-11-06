"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { fr } from "@greline/i18n";
import { palettes, type ThemeName, toCssColor } from "@greline/theme";
import type { Stop, TramNetwork } from "@greline/types";
import { type Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView, { AttributionControl, Layer, type MapRef, Marker, NavigationControl, Source } from "react-map-gl/maplibre";
import { useTheme } from "@/lib/theme";
import { colors } from "@/lib/theme-tokens";
import type { UserLocation } from "./locate-button";
import { addTramIcon, TramVehicles } from "./tram-vehicles";

// MapLibre 6 derives its worker URL from its own module URL at runtime, which points into the
// Next.js chunks folder once bundled (404). Referencing the worker with a static
// new URL(..., import.meta.url) makes the bundler emit it and gives us its real URL.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

// OpenFreeMap: OpenStreetMap vector tiles, free, no API key (see docs/decisions/0002-map-tiles.md).
const MAP_STYLES: Record<ThemeName, string> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};
const SELECTED_STATION_ZOOM = 15;
const LOCATED_ZOOM = 15;

/** Aligns the dark base map with our design tokens (the light one is used as is). */
function applyBaseColors(map: MapLibreMap) {
  if (document.documentElement.dataset.theme === "light") return;
  if (map.getLayer("background")) map.setPaintProperty("background", "background-color", palettes.dark.background);
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", palettes.dark.surface);
}

const TRANSPARENT_PIXEL = { width: 1, height: 1, data: new Uint8Array(4) };

/**
 * Set up once the map exists. Draws tram icons on demand; any other missing image is a gap of the
 * base style (its dark variant fills woods with a "wood-pattern" its own sprite lacks, and
 * MapLibre warns for every tile): a transparent stand-in keeps the same look quietly. Base colors
 * are re-applied after every style load, including theme switches.
 */
function setUpMap(ref: MapRef | null) {
  const map = ref?.getMap();
  if (!map) return;
  map.on("style.load", () => applyBaseColors(map));
  // MapLibre opens the compact attribution at start; fold it to the "i" (details live in Sources).
  map.once("load", () => {
    const attribution = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
    attribution?.classList.remove("maplibregl-compact-show");
    attribution?.removeAttribute("open");
  });
  map.setMissingStyleImageResolver(async (id) => {
    if (await addTramIcon(map, id)) return;
    if (!map.hasImage(id)) map.addImage(id, TRANSPARENT_PIXEL);
  });
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
  /** One of the stops nearest to the user ("locate me"). */
  nearby: boolean;
  onSelect: (stopId: string) => void;
}

function ringShadow(selected: boolean, nearby: boolean): string | undefined {
  if (selected) return `0 0 0 3px ${colors.accent}`;
  if (nearby) return `0 0 0 4px color-mix(in srgb, ${colors.accent} 50%, transparent)`;
  return undefined;
}

/** White dot, larger ringed pill for transfers. 24 px hit area. */
function StationButton({ stop, transfer, selected, nearby, onSelect }: StationButtonProps) {
  const size = transfer || nearby ? 14 : 8;
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
            border: `${transfer ? 2 : 1}px solid ${colors.stationOutline}`,
            boxShadow: ringShadow(selected, nearby),
          }}
        />
      </button>
    </Marker>
  );
}

function UserMarker({ lat, lon }: { lat: number; lon: number }) {
  return (
    <Marker longitude={lon} latitude={lat} anchor="center">
      <span
        role="img"
        aria-label={fr.locate.youAreHere}
        title={fr.locate.youAreHere}
        className="block h-4 w-4 rounded-full border-2"
        style={{ background: colors.accent, borderColor: colors.station }}
      />
    </Marker>
  );
}

interface GeoMapProps {
  network: TramNetwork;
  selectedId: string | null;
  onSelect: (stopId: string) => void;
  userLocation: UserLocation | null;
}

/** Real geographic map: official track shapes, moving trams and stations on an OpenStreetMap base. */
export function GeoMap({ network, selectedId, onSelect, userLocation }: GeoMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  // Stable callback: React calls a new ref callback on every render otherwise.
  const attachMap = useCallback((ref: MapRef | null) => {
    mapRef.current = ref;
    setUpMap(ref);
  }, []);
  const nearbyIds = useMemo(() => new Set(userLocation?.nearby.map((n) => n.stop.id)), [userLocation]);

  useEffect(() => {
    if (userLocation) mapRef.current?.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: LOCATED_ZOOM });
  }, [userLocation]);
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

  const theme = useTheme();
  // Computed once: the map then owns its camera (uncontrolled). An already selected station is
  // centered on; otherwise the whole network is framed.
  const [initialViewState] = useState(() => {
    const selected = network.stops.find((s) => s.id === selectedId);
    if (selected) return { longitude: selected.lon, latitude: selected.lat, zoom: SELECTED_STATION_ZOOM };
    return { bounds: networkBounds(network.stops), fitBoundsOptions: { padding: 40 } };
  });

  return (
    <div className="h-full w-full" role="region" aria-label={fr.geoMap.ariaLabel}>
      <MapView
        ref={attachMap}
        initialViewState={initialViewState}
        mapStyle={MAP_STYLES[theme]}
        // A full style reload on theme switch fires "style.load", where base colors are re-applied.
        styleDiffing={false}
        attributionControl={false}
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
        <TramVehicles lines={network.lines} />
        {network.stops.map((stop) => (
          <StationButton
            key={stop.id}
            stop={stop}
            transfer={transferIds.has(stop.id)}
            selected={stop.id === selectedId}
            nearby={nearbyIds.has(stop.id)}
            onSelect={onSelect}
          />
        ))}
        {userLocation && <UserMarker lat={userLocation.lat} lon={userLocation.lon} />}
        <NavigationControl position="bottom-right" showCompass={false} />
        {/* Licences (OSM, ODbL) require credits on the map: a folded "i" here, details in Sources. */}
        <AttributionControl compact position="bottom-right" customAttribution={[fr.geoMap.osmCredit, fr.geoMap.dataCredit]} />
      </MapView>
    </div>
  );
}
