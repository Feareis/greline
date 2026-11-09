"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { fr } from "@greline/i18n";
import { palettes, type ThemeName, toCssColor } from "@greline/theme";
import type { Disruption, LonLat, NetworkId, Stop, TransitNetwork } from "@greline/types";
import { type ExpressionSpecification, type Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { MapFocus } from "./network-view";
import { ParkAndRideMarkers } from "./park-and-ride-markers";
import { addVehicleIcon, Vehicles, VEHICLES_LAYER } from "./vehicles";

// MapLibre 6 derives its worker URL from its own module URL at runtime, which points into the
// Next.js chunks folder once bundled (404). Referencing the worker with a static
// new URL(..., import.meta.url) makes the bundler emit it and gives us its real URL.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

// OpenFreeMap: OpenStreetMap vector tiles, free, no API key (see docs/decisions/02-map-tiles.md).
const MAP_STYLES: Record<ThemeName, string> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};
const SELECTED_STATION_ZOOM = 15;
/** Close enough to see the followed vehicle move along the streets. */
const FOLLOW_ZOOM = 15;
const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
const LOCATED_ZOOM = 15;
/** Bus stops and line numbers only show once the map is zoomed enough to tell them apart. */
const BUS_STOPS_MIN_ZOOM = 13;
const BUS_STOPS_LAYER = "bus-stops";
// Transit-map convention: trams are thick and outlined, buses thin and slightly faded underneath.
const TRAM_WIDTH: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 11, 2.5, 16, 8];
const TRAM_CASING_WIDTH: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 11, 4.5, 16, 12];
const BUS_WIDTH: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 11, 1, 16, 3];
const BUS_OPACITY = 0.8;
/** Lines other than the one whose panel is open fade into the background. */
const FADED_OPACITY = 0.2;
const LINE_FOCUS_PADDING = 60;
/** Wide screens: the panel covers the right (w-80 plus margins). */
const SIDE_PANEL_SPACE = 350;
/** Narrow screens: the top bar and the folded network panel stack at the top... */
const NARROW_TOP_SPACE = 160;
/** ...and the panel covers the bottom 60 % (max-h-[60%]). */
const NARROW_PANEL_SHARE = 0.6;

/** Room around a framed line, so the floating controls and the open panel hide none of it. */
function lineFocusPadding() {
  const edge = LINE_FOCUS_PADDING / 2;
  if (window.matchMedia("(min-width: 640px)").matches) {
    return { top: LINE_FOCUS_PADDING, bottom: LINE_FOCUS_PADDING, left: LINE_FOCUS_PADDING, right: SIDE_PANEL_SPACE };
  }
  return { top: NARROW_TOP_SPACE, bottom: window.innerHeight * NARROW_PANEL_SHARE + edge, left: edge, right: edge };
}
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

type Bounds = [[number, number], [number, number]];

function networkBounds(stops: readonly Stop[]): Bounds {
  return pointsBounds(stops.map((stop) => [stop.lon, stop.lat]));
}

function pointsBounds(points: readonly (readonly [number, number])[]): Bounds {
  const lons = points.map(([lon]) => lon);
  const lats = points.map(([, lat]) => lat);
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

/**
 * Stops of the shown lines: tram stations (buttons) and stops served by buses only (map layer).
 * The line whose panel is open is shown even when its network is filtered out.
 */
function useShownStops(network: TransitNetwork, networks: readonly NetworkId[], selectedLineId: string | null) {
  return useMemo(() => {
    const shownLines = network.lines.filter((line) => networks.includes(line.network) || line.id === selectedLineId);
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
  }, [network, networks, selectedLineId]);
}

/** Line opacity: as given, unless a line is selected, then only that one stays opaque. */
function emphasis(selectedLineId: string | null, opacity: number): ExpressionSpecification | number {
  return selectedLineId ? ["case", ["==", ["get", "id"], selectedLineId], 1, FADED_OPACITY] : opacity;
}

/** Brings a stop or a line picked from a list into view. */
function useFocus(mapRef: RefObject<MapRef | null>, network: TransitNetwork, focus: MapFocus | null) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    if (focus.kind === "line") {
      const line = network.lines.find((l) => l.id === focus.id);
      if (line) map.fitBounds(pointsBounds(line.shape.flat()), { padding: lineFocusPadding() });
      return;
    }
    if (focus.kind !== "stop") return;
    const stop = network.stops.find((s) => s.id === focus.id);
    if (stop) map.flyTo({ center: [stop.lon, stop.lat], zoom: Math.max(map.getZoom(), SELECTED_STATION_ZOOM) });
  }, [mapRef, focus, network]);
}

/**
 * Keeps the followed vehicle in view: one eased move to it, then the camera sticks to it until the
 * user drags the map. The padding keeps it clear of the open panel, and is dropped with the panel.
 */
function useFollowCamera(mapRef: RefObject<MapRef | null>, followedKey: string | null, following: boolean) {
  const started = useRef(false);
  const padded = useRef(false);
  useEffect(() => {
    started.current = false;
  }, [followedKey, following]);
  useEffect(() => {
    if (followedKey || !padded.current) return;
    padded.current = false;
    mapRef.current?.easeTo({ padding: NO_PADDING });
  }, [mapRef, followedKey]);
  return useCallback(
    (position: LonLat) => {
      const map = mapRef.current;
      if (!map || !following) return;
      if (!started.current) {
        started.current = true;
        padded.current = true;
        map.easeTo({ center: position, zoom: Math.max(map.getZoom(), FOLLOW_ZOOM), padding: lineFocusPadding() });
        return;
      }
      // A move under way (this eased one, a zoom button, a pinch) would be cut short at every redraw otherwise.
      if (!map.getMap().isMoving()) map.jumpTo({ center: position });
    },
    [mapRef, following],
  );
}

/** The followed vehicle: its key and network (drawn even when the filter hides that network). */
export interface FollowedVehicle {
  key: string;
  network: NetworkId | null;
  /** The camera sticks to it until the user drags the map. */
  following: boolean;
}

interface GeoMapProps {
  network: TransitNetwork;
  /** Networks shown on the map (lines, stops, vehicles). */
  networks: readonly NetworkId[];
  /** Ongoing disruptions to dash on the map: their stretch, or the whole line (see isDrawnOnMap). */
  disrupted: readonly Disruption[];
  /** A stop or a line to bring into view, picked from a list. */
  focus: MapFocus | null;
  selectedId: string | null;
  /** The line whose panel is open: highlighted, the others faded. */
  selectedLineId: string | null;
  onSelect: (stopId: string) => void;
  userLocation: UserLocation | null;
  /** P+R car parks on the map, with their free spaces. */
  showParkAndRides: boolean;
  followed: FollowedVehicle | null;
  onSelectVehicle: (vehicleKey: string) => void;
  /** The user dragged the map: the camera stops following the vehicle. */
  onFollowLost: () => void;
}

/** Real geographic map: official shapes, moving vehicles and stops on an OpenStreetMap base. */
export function GeoMap(props: GeoMapProps) {
  const { network, networks, disrupted, focus, selectedId, selectedLineId, onSelect, userLocation, showParkAndRides } = props;
  const { followed, onSelectVehicle, onFollowLost } = props;
  const mapRef = useRef<MapRef | null>(null);
  // Stable callback: React calls a new ref callback on every render otherwise.
  const attachMap = useCallback((ref: MapRef | null) => {
    mapRef.current = ref;
    setUpMap(ref);
  }, []);
  const theme = useTheme();
  const palette = palettes[theme];
  const nearbyIds = useMemo(() => new Set(userLocation?.nearby.map((n) => n.stop.id)), [userLocation]);
  const { shownLines, tramStations, transferIds, busStops } = useShownStops(network, networks, selectedLineId);
  const [hoveringStop, setHoveringStop] = useState(false);

  useEffect(() => {
    if (userLocation) mapRef.current?.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: LOCATED_ZOOM });
  }, [userLocation]);

  useFocus(mapRef, network, focus);
  const followVehicle = useFollowCamera(mapRef, followed?.key ?? null, followed?.following ?? false);
  const followedNetwork = followed?.network ?? null;
  const vehicleNetworks = useMemo(
    () => (followedNetwork && !networks.includes(followedNetwork) ? [...networks, followedNetwork] : networks),
    [networks, followedNetwork],
  );

  const linesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: shownLines.map((line) => ({
        type: "Feature" as const,
        properties: { id: line.id, color: toCssColor(line.color), mode: line.mode, label: line.shortName },
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
  // centered on, an already selected line framed; otherwise the shown network is framed.
  const [initialViewState] = useState(() => {
    const selected = network.stops.find((s) => s.id === selectedId);
    if (selected) return { longitude: selected.lon, latitude: selected.lat, zoom: SELECTED_STATION_ZOOM };
    const line = network.lines.find((l) => l.id === selectedLineId);
    if (line) return { bounds: pointsBounds(line.shape.flat()), fitBoundsOptions: { padding: lineFocusPadding() } };
    return { bounds: networkBounds(tramStations.length > 0 ? tramStations : busStops), fitBoundsOptions: { padding: 40 } };
  });

  // The topmost feature wins: vehicles are drawn over the bus stops.
  const selectFeature = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const properties: Record<string, unknown> = feature?.properties ?? {};
    if (feature?.layer.id === VEHICLES_LAYER && typeof properties.key === "string") onSelectVehicle(properties.key);
    else if (typeof properties.id === "string") onSelect(properties.id);
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
        interactiveLayerIds={[BUS_STOPS_LAYER, VEHICLES_LAYER]}
        onClick={selectFeature}
        onDragStart={() => {
          if (followed?.following) onFollowLost();
        }}
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
            paint={{ "line-color": ["get", "color"], "line-width": BUS_WIDTH, "line-opacity": emphasis(selectedLineId, BUS_OPACITY) }}
          />
          <Layer
            id="tram-casing"
            type="line"
            filter={["==", ["get", "mode"], "tram"]}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": palette.background, "line-width": TRAM_CASING_WIDTH, "line-opacity": emphasis(selectedLineId, 1) }}
          />
          <Layer
            id="tram-lines"
            type="line"
            filter={["==", ["get", "mode"], "tram"]}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": ["get", "color"], "line-width": TRAM_WIDTH, "line-opacity": emphasis(selectedLineId, 1) }}
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
        <Vehicles
          lines={network.lines}
          networks={vehicleNetworks}
          theme={theme}
          followedKey={followed?.key ?? null}
          onFollowedMove={followed?.following ? followVehicle : undefined}
        />
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
        {showParkAndRides && <ParkAndRideMarkers />}
        {userLocation && <UserMarker lat={userLocation.lat} lon={userLocation.lon} />}
        <NavigationControl position="bottom-right" showCompass={false} />
        {/* Licences (OSM, ODbL) require credits on the map: a folded "i" here, details in Sources. */}
        <AttributionControl compact position="bottom-right" customAttribution={[fr.geoMap.osmCredit, fr.geoMap.dataCredit]} />
      </MapView>
    </div>
  );
}
