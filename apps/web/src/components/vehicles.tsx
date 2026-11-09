"use client";

import { useSchedules, useTripDelays } from "@greline/hooks";
import { cumulativeDistances, LATE_THRESHOLD_SECONDS, pointAtDistance, vehiclePositions } from "@greline/services";
import { colors as iconColors, palettes, type ThemeName } from "@greline/theme";
import type { Line, LineMode, NetworkId, TransitSchedule } from "@greline/types";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";

const SOURCE_ID = "vehicles";
/** Vehicles move a few meters per second: 10 redraws per second look smooth and spare the CPU. */
const REDRAW_INTERVAL_MS = 100;
/** Line numbers next to buses from this zoom on (Chrono lines all share one color). */
const LABEL_MIN_ZOOM = 14;
/** GeoJSON types come through MapLibre, which already depends on them. */
type FeatureCollection = Extract<Parameters<GeoJSONSource["setData"]>[0], { type: "FeatureCollection" }>;
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Icon ids carry what the icon looks like, so the map can draw them on demand. */
export const vehicleIconId = (mode: LineMode, lineColor: string, late: boolean): string =>
  `${mode}-${lineColor}${late ? "-late" : ""}`;
const VEHICLE_ICON_ID = /^(tram|bus)-([0-9A-Fa-f]{6})(-late)?$/;

// Icons are bitmaps: they take real color values, the same in both themes. Both point east
// (bearing 90) and are drawn at 2x for sharp screens.
function outline(late: boolean): string {
  return `stroke="${late ? iconColors.late : iconColors.station}" stroke-width="${late ? 2.5 : 1.5}" stroke-linejoin="round"`;
}

/** A long articulated tram with a pointed nose. */
function tramSvg(lineColor: string, late: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 50 20">
<path d="M5 4h33c4.4 0 9 2.7 9 6s-4.6 6-9 6H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#${lineColor}" ${outline(late)}/>
<path d="M40 6.3c2.8.6 4.8 2 4.8 3.7s-2 3.1-4.8 3.7z" fill="${iconColors.background}" fill-opacity=".75"/>
<path d="M16 4.8v10.4M28 4.8v10.4" stroke="${iconColors.background}" stroke-opacity=".45"/>
</svg>`;
}

/** A shorter, boxy bus with a flat front and a row of windows. */
function busSvg(lineColor: string, late: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="76" height="40" viewBox="0 0 38 20">
<rect x="3" y="4" width="32" height="12" rx="3.5" fill="#${lineColor}" ${outline(late)}/>
<rect x="29" y="6" width="4" height="8" rx="1.2" fill="${iconColors.background}" fill-opacity=".75"/>
<path d="M7 6.8h4M13 6.8h4M19 6.8h4M7 13.2h4M13 13.2h4M19 13.2h4" stroke="${iconColors.background}" stroke-opacity=".45" stroke-width="1.4"/>
</svg>`;
}

/**
 * Adds the vehicle icon named `id` to the map. Returns false when `id` is not a vehicle icon,
 * so the caller can handle other missing images.
 */
export async function addVehicleIcon(map: MapLibreMap, id: string): Promise<boolean> {
  const match = VEHICLE_ICON_ID.exec(id);
  if (!match) return false;
  const late = match[3] !== undefined;
  const svg = match[1] === "tram" ? tramSvg(match[2]!, late) : busSvg(match[2]!, late);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: 2 });
  return true;
}

interface TrackedSchedule {
  schedule: TransitSchedule;
  tracks: { shape: TransitSchedule["shapes"][number]; cumulative: number[] }[];
}

function vehicleFeatures(
  schedules: readonly TrackedSchedule[],
  delays: Readonly<Record<string, number>>,
  linesById: ReadonlyMap<string, Line>,
): FeatureCollection {
  const now = Date.now() / 1000;
  const features = schedules.flatMap(({ schedule, tracks }) =>
    vehiclePositions(schedule, delays, now).flatMap((vehicle) => {
      const line = linesById.get(vehicle.lineId);
      if (!line) return [];
      const track = tracks[schedule.patterns[vehicle.pattern]!.shape]!;
      const { lon, lat, bearing } = pointAtDistance(track.shape, track.cumulative, vehicle.distance);
      const late = vehicle.delaySeconds > LATE_THRESHOLD_SECONDS;
      return [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [lon, lat] },
          properties: {
            icon: vehicleIconId(line.mode, line.color.replace("#", ""), late),
            // The icon points east: rotate it from there to the direction of travel.
            rotate: bearing - 90,
            label: line.mode === "bus" ? line.shortName : "",
            // Drawn on top: trams over buses, late vehicles over the others.
            order: (line.mode === "tram" ? 1 : 0) + (late ? 2 : 0),
          },
        },
      ];
    }),
  );
  return { type: "FeatureCollection", features };
}

interface VehiclesProps {
  lines: readonly Line[];
  networks: readonly NetworkId[];
  theme: ThemeName;
}

/**
 * Trams and buses of the shown networks moving along their real track in real time (x1).
 * Positions come from today's schedules shifted by realtime delays; the GeoJSON source is
 * updated outside React renders.
 */
export function Vehicles({ lines, networks, theme }: VehiclesProps) {
  const { current: mapRef } = useMap();
  const { schedules } = useSchedules(networks);
  const delays = useTripDelays().data?.delays;
  const linesById = useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines]);
  const tracked = useMemo(
    () =>
      schedules.map((schedule) => ({
        schedule,
        tracks: schedule.shapes.map((shape) => ({ shape, cumulative: cumulativeDistances(shape) })),
      })),
    [schedules],
  );

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    let frame = 0;
    let lastDraw = -Infinity;
    const draw = (timestamp: number) => {
      frame = requestAnimationFrame(draw);
      if (timestamp - lastDraw < REDRAW_INTERVAL_MS) return;
      // Undefined until the style has loaded the source.
      const source = map.getSource<GeoJSONSource>(SOURCE_ID);
      if (!source) return;
      lastDraw = timestamp;
      source.setData(vehicleFeatures(tracked, delays ?? {}, linesById));
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [mapRef, tracked, delays, linesById]);

  const palette = palettes[theme];
  return (
    <Source id={SOURCE_ID} type="geojson" data={EMPTY}>
      <Layer
        id={SOURCE_ID}
        type="symbol"
        layout={{
          "icon-image": ["get", "icon"],
          "icon-rotate": ["get", "rotate"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.45, 14, 0.65, 17, 1.1],
          "symbol-sort-key": ["get", "order"],
          "text-field": ["step", ["zoom"], "", LABEL_MIN_ZOOM, ["get", "label"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-offset": [0, 1],
          "text-anchor": "top",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        }}
        paint={{ "text-color": palette.text, "text-halo-color": palette.background, "text-halo-width": 1.5 }}
      />
    </Source>
  );
}
