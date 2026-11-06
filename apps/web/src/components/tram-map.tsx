"use client";

import { fr } from "@greline/i18n";
import { type LabelSide, placeLabels } from "@greline/schematic";
import { colors, toCssColor } from "@greline/theme";
import type { SchematicMap, SchematicStation, Stop, TramNetwork } from "@greline/types";
import { select } from "d3-selection";
import { zoom } from "d3-zoom";
import { useEffect, useMemo, useRef } from "react";
import { LINE_SPACING, LINE_WIDTH } from "./map-style";

const MAX_ZOOM = 8;
const STATION_RADIUS = 3;
const HIT_RADIUS = 12;
const LABEL_FONT_SIZE = 10;

const isTransfer = (station: SchematicStation): boolean => station.lineIds.length > 1;

/** A white transfer pill wide enough to cover the bundle of parallel lines it sits on. */
const stationRadius = (station: SchematicStation): number =>
  isTransfer(station) ? ((station.lineIds.length - 1) * LINE_SPACING + LINE_WIDTH) / 2 + 2 : STATION_RADIUS;

/**
 * Only termini (first) and transfers (busiest first) compete for a label, and overlapping ones
 * are dropped: every name stays available in the tooltip and the station panel.
 */
function placeStationLabels(map: SchematicMap, network: TramNetwork): Map<string, LabelSide> {
  const names = new Map(network.stops.map((s) => [s.id, s.name]));
  const termini = new Set(network.lines.flatMap((line) => [line.stopIds[0], line.stopIds.at(-1)]));
  // Termini outrank any transfer (a station never has 100 lines); finite so a - b stays a number.
  const priority = (s: SchematicStation) => (termini.has(s.stopId) ? 100 : s.lineIds.length);
  const candidates = map.stations
    .filter((s) => isTransfer(s) || termini.has(s.stopId))
    .sort((a, b) => priority(b) - priority(a))
    .map((s) => ({ id: s.stopId, anchor: s.position, offset: stationRadius(s) + 4, text: names.get(s.stopId) ?? "" }));
  return placeLabels(candidates, LABEL_FONT_SIZE);
}

interface StationMarkerProps {
  station: SchematicStation;
  stop: Stop;
  labelSide: LabelSide | undefined;
  selected: boolean;
  onSelect: (stopId: string) => void;
}

function StationMarker({ station, stop, labelSide, selected, onSelect }: StationMarkerProps) {
  const { x, y } = station.position;
  const radius = stationRadius(station);
  const transfer = isTransfer(station);
  return (
    <g
      className="station cursor-pointer outline-none"
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={stop.name}
      aria-pressed={selected}
      onClick={() => onSelect(stop.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(stop.id);
      }}
    >
      <title>{stop.name}</title>
      <circle r={Math.max(HIT_RADIUS, radius)} fill="transparent" />
      <circle r={radius} fill={colors.station} stroke={transfer ? colors.background : "none"} strokeWidth={transfer ? 2 : 0} />
      <circle className="focus-ring" r={radius + 4} fill="none" stroke={colors.accent} strokeWidth={2} opacity={selected ? 1 : 0} />
      {labelSide && (
        <text
          x={labelSide === "left" ? -(radius + 4) : radius + 4}
          y={LABEL_FONT_SIZE / 3}
          textAnchor={labelSide === "left" ? "end" : "start"}
          fontSize={LABEL_FONT_SIZE}
          fill={colors.text}
          stroke={colors.background}
          strokeWidth={3}
          paintOrder="stroke"
          className="select-none"
        >
          {stop.name}
        </text>
      )}
    </g>
  );
}

interface TramMapProps {
  map: SchematicMap;
  network: TramNetwork;
  selectedId: string | null;
  onSelect: (stopId: string) => void;
}

/** Interactive schematic tram map: pan and zoom (mouse, touch), station selection on click. */
export function TramMap({ map, network, selectedId, onSelect }: TramMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);

  const stopsById = useMemo(() => new Map(network.stops.map((s) => [s.id, s])), [network.stops]);
  const linesById = useMemo(() => new Map(network.lines.map((l) => [l.id, l])), [network.lines]);
  const labelSides = useMemo(() => placeStationLabels(map, network), [map, network]);

  useEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer) return;
    // d3-zoom handles wheel, drag, pinch and double-tap, and swallows the click that ends a drag.
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [map.width, map.height],
      ])
      .on("zoom", (event: { transform: { toString(): string } }) => {
        layer.setAttribute("transform", event.transform.toString());
      });
    const selection = select(svg).call(behavior);
    return () => {
      selection.on(".zoom", null);
    };
  }, [map.width, map.height]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${map.width} ${map.height}`}
      role="img"
      aria-label={fr.map.ariaLabel}
      className="h-full w-full touch-none select-none"
    >
      <g ref={layerRef}>
        {map.paths.map((path) => (
          <polyline
            key={path.lineId}
            points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={toCssColor(linesById.get(path.lineId)?.color ?? "FFFFFF")}
            strokeWidth={LINE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {map.stations.map((station) => {
          const stop = stopsById.get(station.stopId);
          if (!stop) return null;
          return (
            <StationMarker
              key={station.stopId}
              station={station}
              stop={stop}
              labelSide={labelSides.get(station.stopId)}
              selected={station.stopId === selectedId}
              onSelect={onSelect}
            />
          );
        })}
      </g>
    </svg>
  );
}
