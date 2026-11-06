"use client";

import { useTramSchedule, useTripDelays } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { cumulativeDistances, LATE_THRESHOLD_SECONDS, pointAtDistance, vehiclePositions } from "@greline/services";
import { colors, radii } from "@greline/theme";
import type { Line, TramSchedule } from "@greline/types";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";

const SOURCE_ID = "trams";
/** Trams move a few meters per second: 10 redraws per second look smooth and spare the CPU. */
const REDRAW_INTERVAL_MS = 100;
/** GeoJSON types come through MapLibre, which already depends on them. */
type FeatureCollection = Extract<Parameters<GeoJSONSource["setData"]>[0], { type: "FeatureCollection" }>;
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Icon ids carry what the icon looks like, so the map can draw them on demand. */
export const tramIconId = (lineColor: string, late: boolean): string => `tram-${lineColor}${late ? "-late" : ""}`;
const TRAM_ICON_ID = /^tram-([0-9A-Fa-f]{6})(-late)?$/;

/** A tram seen from above, nose pointing east (bearing 90). Drawn at 2x for sharp screens. */
function tramSvg(lineColor: string, late: boolean): string {
  const stroke = late ? colors.late : colors.station;
  const strokeWidth = late ? 2.5 : 1.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 50 20">
<path d="M5 4h33c4.4 0 9 2.7 9 6s-4.6 6-9 6H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#${lineColor}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
<path d="M40 6.3c2.8.6 4.8 2 4.8 3.7s-2 3.1-4.8 3.7z" fill="${colors.background}" fill-opacity=".75"/>
<path d="M16 4.8v10.4M28 4.8v10.4" stroke="${colors.background}" stroke-opacity=".45"/>
</svg>`;
}

/**
 * Adds the tram icon named `id` to the map. Returns false when `id` is not a tram icon, so
 * the caller can handle other missing images.
 */
export async function addTramIcon(map: MapLibreMap, id: string): Promise<boolean> {
  const match = TRAM_ICON_ID.exec(id);
  if (!match) return false;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tramSvg(match[1]!, match[2] !== undefined))}`;
  await image.decode();
  if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: 2 });
  return true;
}

interface Track {
  shape: TramSchedule["shapes"][number];
  cumulative: number[];
}

function vehicleFeatures(
  schedule: TramSchedule,
  tracks: readonly Track[],
  delays: Readonly<Record<string, number>>,
  colorByLine: ReadonlyMap<string, string>,
): FeatureCollection {
  const features = vehiclePositions(schedule, delays, Date.now() / 1000).map((vehicle) => {
    const track = tracks[schedule.patterns[vehicle.pattern]!.shape]!;
    const { lon, lat, bearing } = pointAtDistance(track.shape, track.cumulative, vehicle.distance);
    const color = colorByLine.get(vehicle.lineId) ?? "FFFFFF";
    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [lon, lat] },
      // The icon points east: rotate it from there to the direction of travel.
      properties: { icon: tramIconId(color, vehicle.delaySeconds > LATE_THRESHOLD_SECONDS), rotate: bearing - 90 },
    };
  });
  return { type: "FeatureCollection", features };
}

/**
 * Trams moving along their real track in real time (x1). Positions come from today's schedule
 * shifted by realtime delays; the GeoJSON source is updated outside React renders.
 */
export function TramVehicles({ lines }: { lines: readonly Line[] }) {
  const { current: mapRef } = useMap();
  const { data: schedule } = useTramSchedule();
  const { data: delays } = useTripDelays();
  const colorByLine = useMemo(() => new Map(lines.map((l) => [l.id, l.color.replace("#", "")])), [lines]);
  const tracks = useMemo(
    () => schedule?.shapes.map((shape) => ({ shape, cumulative: cumulativeDistances(shape) })),
    [schedule],
  );

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !schedule || !tracks) return;
    let frame = 0;
    let lastDraw = -Infinity;
    const draw = (timestamp: number) => {
      frame = requestAnimationFrame(draw);
      if (timestamp - lastDraw < REDRAW_INTERVAL_MS) return;
      // Undefined until the style has loaded the source.
      const source = map.getSource<GeoJSONSource>(SOURCE_ID);
      if (!source) return;
      lastDraw = timestamp;
      source.setData(vehicleFeatures(schedule, tracks, delays ?? {}, colorByLine));
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [mapRef, schedule, tracks, delays, colorByLine]);

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
        }}
      />
    </Source>
  );
}

/** Explains the moving trams; says so when the schedule cannot be loaded. */
export function TramLegend() {
  const { isError } = useTramSchedule();
  return (
    <p
      className="absolute bottom-3 left-3 z-10 max-w-xs px-3 py-2 text-xs shadow-lg"
      style={{ background: colors.surface, color: colors.textMuted, borderRadius: radii.md }}
    >
      {isError ? (
        fr.trams.unavailable
      ) : (
        <>
          {fr.trams.legend}
          <br />
          <span style={{ color: colors.late }}>{fr.trams.late}</span>
        </>
      )}
    </p>
  );
}
