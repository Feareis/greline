"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { fr } from "@greline/i18n";
import { palettes, type ThemeName, toCssColor } from "@greline/theme";
import type { Disruption, NetworkId, Stop, TransitNetwork } from "@greline/types";
import { type ExpressionSpecification, type Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView, {
  AttributionControl,
  Layer,
  type MapLayerMouseEvent,
  type MapRef,
  Marker,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import { useTheme } from "@/lib/theme";
import { colors } from "@/lib/theme-tokens";
import type { UserLocation } from "./locate-button";
import { addVehicleIcon, Vehicles } from "./vehicles";

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
/** Bus stops and line numbers only show once the map is zoomed enough to tell them apart. */
const BUS_STOPS_MIN_ZOOM = 13;
const BUS_STOPS_LAYER = "bus-stops";
// Transit-map convention: trams are thick and outlined, buses thin and slightly faded underneath.
const TRAM_WIDTH: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 11, 2.5, 16, 8];
const TRAM_CASING_WIDTH: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 11, 4.5, 16, 12];
const BUS_WIDTH: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 11, 1, 16, 3];
const BUS_OPACITY = 0.8;
/**
 * Disrupted stretches: the line is cut into dashes (gaps in the map background color) and edged
 * with the severity color, readable whatever the line color (amber over yellow Chrono lines is not).
 */
const DISRUPTED_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  11,
  ["case", ["==", ["get", "mode"], "tram"], 2.5, 1.5],
  16,
  ["case", ["==", ["get", "mode"], "tram"], 8, 4],
];

/** Aligns the dark base map with our design tokens (the light one is used as is). */
function applyBaseColors(map: MapLibreMap) {
  if (document.documentElement.dataset.theme === "light") return;
  if (map.getLayer("background")) map.setPaintProperty("background", "background-color", palettes.dark.background);
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", palettes.dark.surface);
}

const TRANSPARENT_PIXEL = { width: 1, height: 1, data: new Uint8Array(4) };

/**
 * Set up once the map exists. Draws vehicle icons on demand; any other missing image is a gap of
 * the base style (its dark variant fills woods with a "wood-pattern" its own sprite lacks, and
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
    if (await addVehicleIcon(map, id)) return;
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

/** Tram station: white dot, larger ringed pill for transfers. A real button, 24 px hit area. */
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

/** Stops of the shown lines: tram stations (buttons) and stops served by buses only (map layer). */
function useShownStops(network: TransitNetwork, networks: readonly NetworkId[]) {
  return useMemo(() => {
    const shownLines = network.lines.filter((line) => networks.includes(line.network));
    const tramLinesAt = new Map<string, number>();
    for (const line of shownLines) {
      if (line.mode !== "tram") continue;
      for (const id of line.stopIds) tramLinesAt.set(id, (tramLinesAt.get(id) ?? 0) + 1);
    }
    const busOnlyIds = new Set(shownLines.filter((l) => l.mode === "bus").flatMap((l) => l.stopIds).filter((id) => !tramLinesAt.has(id)));
    return {
      shownLines,
      tramStations: network.stops.filter((stop) => tramLinesAt.has(stop.id)),
      transferIds: new Set([...tramLinesAt].filter(([, count]) => count > 1).map(([id]) => id)),
      busStops: network.stops.filter((stop) => busOnlyIds.has(stop.id)),
    };
  }, [network, networks]);
}

interface GeoMapProps {
  network: TransitNetwork;
  /** Networks shown on the map (lines, stops, vehicles). */
  networks: readonly NetworkId[];
  /** Ongoing disruptions to dash on the map: their stretch, or the whole line. */
  disrupted: readonly Disruption[];
  selectedId: string | null;
  onSelect: (stopId: string) => void;
  userLocation: UserLocation | null;
}

/** Real geographic map: official shapes, moving vehicles and stops on an OpenStreetMap base. */
export function GeoMap({ network, networks, disrupted, selectedId, onSelect, userLocation }: GeoMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  // Stable callback: React calls a new ref callback on every render otherwise.
  const attachMap = useCallback((ref: MapRef | null) => {
    mapRef.current = ref;
    setUpMap(ref);
  }, []);
  const theme = useTheme();
  const palette = palettes[theme];
  const nearbyIds = useMemo(() => new Set(userLocation?.nearby.map((n) => n.stop.id)), [userLocation]);
  const { shownLines, tramStations, transferIds, busStops } = useShownStops(network, networks);
  const [hoveringStop, setHoveringStop] = useState(false);

  useEffect(() => {
    if (userLocation) mapRef.current?.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: LOCATED_ZOOM });
  }, [userLocation]);

  const linesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: shownLines.map((line) => ({
        type: "Feature" as const,
        properties: { color: toCssColor(line.color), mode: line.mode, label: line.shortName },
        geometry: { type: "MultiLineString" as const, coordinates: line.shape },
      })),
    }),
    [shownLines],
  );
  const disruptedData = useMemo(() => {
    const linesById = new Map(network.lines.map((line) => [line.id, line]));
    return {
      type: "FeatureCollection" as const,
      features: disrupted.flatMap((disruption) => {
        const line = linesById.get(disruption.lineId);
        if (!line) return [];
        const geometry = disruption.stretch
          ? { type: "LineString" as const, coordinates: disruption.stretch }
          : { type: "MultiLineString" as const, coordinates: line.shape };
        return [{ type: "Feature" as const, properties: { severity: disruption.severity, mode: line.mode }, geometry }];
      }),
    };
  }, [disrupted, network.lines]);
  const busStopsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: busStops.map((stop) => ({
        type: "Feature" as const,
        properties: { id: stop.id, ringed: stop.id === selectedId || nearbyIds.has(stop.id) },
        geometry: { type: "Point" as const, coordinates: [stop.lon, stop.lat] },
      })),
    }),
    [busStops, selectedId, nearbyIds],
  );

  // Computed once: the map then owns its camera (uncontrolled). An already selected station is
  // centered on; otherwise the shown network is framed.
  const [initialViewState] = useState(() => {
    const selected = network.stops.find((s) => s.id === selectedId);
    if (selected) return { longitude: selected.lon, latitude: selected.lat, zoom: SELECTED_STATION_ZOOM };
    return { bounds: networkBounds(tramStations.length > 0 ? tramStations : busStops), fitBoundsOptions: { padding: 40 } };
  });

  const selectBusStop = (event: MapLayerMouseEvent) => {
    const id: unknown = event.features?.[0]?.properties?.id;
    if (typeof id === "string") onSelect(id);
  };

  return (
    <div className="h-full w-full" role="region" aria-label={fr.geoMap.ariaLabel}>
      <MapView
        ref={attachMap}
        initialViewState={initialViewState}
        mapStyle={MAP_STYLES[theme]}
        // A full style reload on theme switch fires "style.load", where base colors are re-applied.
        styleDiffing={false}
        attributionControl={false}
        interactiveLayerIds={[BUS_STOPS_LAYER]}
        onClick={selectBusStop}
        onMouseEnter={() => setHoveringStop(true)}
        onMouseLeave={() => setHoveringStop(false)}
        cursor={hoveringStop ? "pointer" : undefined}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="lines" type="geojson" data={linesData}>
          {/* Buses below trams, thinner and faded; their numbers along the line (Chrono lines share a color). */}
          <Layer
            id="bus-lines"
            type="line"
            filter={["==", ["get", "mode"], "bus"]}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": ["get", "color"], "line-width": BUS_WIDTH, "line-opacity": BUS_OPACITY }}
          />
          <Layer
            id="tram-casing"
            type="line"
            filter={["==", ["get", "mode"], "tram"]}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": palette.background, "line-width": TRAM_CASING_WIDTH }}
          />
          <Layer
            id="tram-lines"
            type="line"
            filter={["==", ["get", "mode"], "tram"]}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": ["get", "color"], "line-width": TRAM_WIDTH }}
          />
          <Layer
            id="bus-line-labels"
            type="symbol"
            minzoom={BUS_STOPS_MIN_ZOOM}
            filter={["==", ["get", "mode"], "bus"]}
            layout={{
              "symbol-placement": "line",
              "symbol-spacing": 300,
              "text-field": ["get", "label"],
              "text-font": ["Noto Sans Bold"],
              "text-size": 11,
            }}
            paint={{ "text-color": palette.text, "text-halo-color": palette.background, "text-halo-width": 1.5 }}
          />
        </Source>
        {/* Above the lines, below the stops. */}
        <Source id="disrupted" type="geojson" data={disruptedData}>
          <Layer
            id="disrupted-edges"
            type="line"
            layout={{ "line-join": "round" }}
            paint={{
              "line-color": ["case", ["==", ["get", "severity"], "interrupted"], palette.danger, palette.warning],
              "line-width": 2,
              "line-gap-width": DISRUPTED_WIDTH,
            }}
          />
          <Layer
            id="disrupted-gaps"
            type="line"
            layout={{ "line-cap": "butt", "line-join": "round" }}
            paint={{ "line-color": palette.background, "line-width": DISRUPTED_WIDTH, "line-dasharray": [1, 1] }}
          />
        </Source>
        <Source id={BUS_STOPS_LAYER} type="geojson" data={busStopsData}>
          <Layer
            id={BUS_STOPS_LAYER}
            type="circle"
            minzoom={BUS_STOPS_MIN_ZOOM}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], BUS_STOPS_MIN_ZOOM, 3, 17, 6],
              "circle-color": palette.station,
              "circle-stroke-color": ["case", ["get", "ringed"], palette.accent, palette.stationOutline],
              "circle-stroke-width": ["case", ["get", "ringed"], 3, 1],
            }}
          />
        </Source>
        <Vehicles lines={network.lines} networks={networks} theme={theme} />
        {tramStations.map((stop) => (
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
