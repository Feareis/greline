"use client";

import { useTramSchedule, useTripDelays } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { pointAlongPolyline } from "@greline/schematic";
import { vehiclePositions } from "@greline/services";
import { colors, radii, toCssColor } from "@greline/theme";
import type { Line, SchematicMap, SchematicPoint } from "@greline/types";
import { useEffect, useMemo, useRef } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";
const VEHICLE_RADIUS = 4;
const LATE_THRESHOLD_S = 120;
/** Trams move a few meters per second: 10 redraws per second look smooth and spare the CPU. */
const REDRAW_INTERVAL_MS = 100;

interface EdgeGeometry {
  points: SchematicPoint[];
  /** The trip runs the edge against the line's drawing order. */
  reversed: boolean;
}

function edgeLookup(map: SchematicMap): Map<string, EdgeGeometry> {
  const lookup = new Map<string, EdgeGeometry>();
  for (const path of map.paths) {
    for (const edge of path.edges) {
      lookup.set(`${path.lineId}|${edge.fromStopId}|${edge.toStopId}`, { points: edge.points, reversed: false });
      lookup.set(`${path.lineId}|${edge.toStopId}|${edge.fromStopId}`, { points: edge.points, reversed: true });
    }
  }
  return lookup;
}

function createVehicle(fill: string): SVGCircleElement {
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("r", String(VEHICLE_RADIUS));
  circle.setAttribute("fill", fill);
  return circle;
}

/**
 * Trams moving along the schematic lines in real time (x1). Positions come from today's
 * schedule shifted by realtime delays; circles are updated imperatively, outside React renders.
 */
export function TramVehicles({ map, lines }: { map: SchematicMap; lines: readonly Line[] }) {
  const groupRef = useRef<SVGGElement>(null);
  const { data: schedule } = useTramSchedule();
  const { data: delays } = useTripDelays();
  const edges = useMemo(() => edgeLookup(map), [map]);
  const colorByLine = useMemo(() => new Map(lines.map((l) => [l.id, toCssColor(l.color)])), [lines]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group || !schedule) return;
    const circles = new Map<string, SVGCircleElement>();
    let frame = 0;
    let lastDraw = 0;
    const draw = (timestamp: number) => {
      frame = requestAnimationFrame(draw);
      if (timestamp - lastDraw < REDRAW_INTERVAL_MS) return;
      lastDraw = timestamp;
      const seen = new Set<string>();
      for (const vehicle of vehiclePositions(schedule, delays ?? {}, Date.now() / 1000)) {
        // Segments outside our canonical lines (occasional variants) are simply not drawn.
        const edge = edges.get(`${vehicle.lineId}|${vehicle.fromStopId}|${vehicle.toStopId}`);
        if (!edge) continue;
        const point = pointAlongPolyline(edge.points, edge.reversed ? 1 - vehicle.progress : vehicle.progress);
        let circle = circles.get(vehicle.key);
        if (!circle) {
          circle = createVehicle(colorByLine.get(vehicle.lineId) ?? colors.station);
          group.appendChild(circle);
          circles.set(vehicle.key, circle);
        }
        const late = vehicle.delaySeconds > LATE_THRESHOLD_S;
        circle.setAttribute("cx", point.x.toFixed(1));
        circle.setAttribute("cy", point.y.toFixed(1));
        circle.setAttribute("stroke", late ? colors.late : colors.station);
        circle.setAttribute("stroke-width", late ? "2.5" : "1.5");
        seen.add(vehicle.key);
      }
      for (const [key, circle] of circles) {
        if (seen.has(key)) continue;
        circle.remove();
        circles.delete(key);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      for (const circle of circles.values()) circle.remove();
    };
  }, [schedule, delays, edges, colorByLine]);

  return <g ref={groupRef} aria-hidden className="pointer-events-none" />;
}

/** Explains the moving dots; says so when the schedule cannot be loaded. */
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
