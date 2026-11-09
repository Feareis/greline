"use client";

import { useFleetSummary } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { radii, toCssColor } from "@greline/theme";
import type { FleetSummary } from "@greline/services";
import { type Line, NETWORK_IDS, type NetworkId } from "@greline/types";
import { useLayoutEffect, useRef } from "react";
import { CHIP, chip, colors, glass } from "@/lib/theme-tokens";
import { ChevronIcon } from "./icons";
import { PARK_AND_RIDE_COLOR } from "./park-and-ride-markers";
import { SECTION_TITLE, SectionTitle } from "./panel-ui";

const SECONDS_PER_MINUTE = 60;

/** "Aucun en retard", "2 en retard · moy. +3 min": the one wording of delays, shared by every panel. */
export function fleetLateText(summary: FleetSummary, delaysAvailable: boolean): string {
  if (!delaysAvailable) return fr.fleet.delaysUnavailable;
  return fr.fleet.lateSummary(summary.late, Math.round(summary.averageLateSeconds / SECONDS_PER_MINUTE));
}

/** The map's vehicle icons, small, for the legend. */
function VehicleGlyph({ bus = false, late = false }: { bus?: boolean; late?: boolean }) {
  const stroke = { stroke: late ? colors.late : colors.station, strokeWidth: late ? 3 : 1.5 };
  return (
    <svg width="30" height="12" viewBox="0 0 50 20" aria-hidden className="shrink-0">
      {bus ? (
        <rect x="9" y="4" width="32" height="12" rx="3.5" fill={colors.textMuted} {...stroke} />
      ) : (
        <path d="M5 4h33c4.4 0 9 2.7 9 6s-4.6 6-9 6H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill={colors.textMuted} {...stroke} />
      )}
    </svg>
  );
}

/** A disrupted stretch, as drawn on the map: dashed line edged with the severity color. */
function DashGlyph({ color }: { color: string }) {
  return (
    <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden className="shrink-0">
      <path d="M2 6h26" stroke={color} strokeWidth="8" />
      <path d="M2 6h26" stroke={colors.background} strokeWidth="5" />
      <path d="M2 6h26" stroke={colors.textMuted} strokeWidth="5" strokeDasharray="4 4" />
    </svg>
  );
}

/** The map's line styles: thick outlined tram, thin faded bus. */
function LineGlyph({ bus = false }: { bus?: boolean }) {
  return (
    <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden className="shrink-0">
      {!bus && <path d="M2 6h26" stroke={colors.background} strokeWidth="8" strokeLinecap="round" />}
      <path d="M2 6h26" stroke={colors.textMuted} strokeWidth={bus ? 2 : 5} strokeOpacity={bus ? 0.8 : 1} strokeLinecap="round" />
    </svg>
  );
}

interface NetworkFilterProps {
  networks: readonly NetworkId[];
  onChange: (networks: readonly NetworkId[]) => void;
}

/** Toggle chips: Tram, Chrono, Proximo, and "All". At least one network stays shown. */
function NetworkFilter({ networks, onChange }: NetworkFilterProps) {
  const toggle = (id: NetworkId) => {
    const next = networks.includes(id) ? networks.filter((n) => n !== id) : NETWORK_IDS.filter((n) => n === id || networks.includes(n));
    if (next.length > 0) onChange(next);
  };
  const all = networks.length === NETWORK_IDS.length;
  return (
    <div role="group" aria-label={fr.networks.label} className="flex flex-wrap gap-1.5">
      {NETWORK_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={networks.includes(id)}
          onClick={() => toggle(id)}
          className={CHIP}
          style={chip(networks.includes(id))}
        >
          {fr.networks.names[id]}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={all}
        onClick={() => onChange(NETWORK_IDS)}
        className={CHIP}
        style={chip(all)}
      >
        {fr.networks.all}
      </button>
    </div>
  );
}

interface LineCountsProps {
  lines: readonly Line[];
  byLine: Readonly<Record<string, number>>;
  onShowLine: (lineId: string) => void;
}

function LineCounts({ lines, byLine, onShowLine }: LineCountsProps) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {lines.map((line) => (
        <li key={line.id}>
          <button
            type="button"
            onClick={() => onShowLine(line.id)}
            aria-label={`${fr.fleet.lineCount(line.shortName, byLine[line.id] ?? 0)}. ${fr.line.open(line.shortName)}`}
            title={fr.line.open(line.shortName)}
            className="flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-sm font-semibold hover:brightness-110 focus-visible:outline-2"
            style={{ background: `color-mix(in srgb, ${toCssColor(line.color)} 18%, transparent)` }}
          >
            <span
              aria-hidden
              className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold"
              style={{ background: toCssColor(line.color), color: toCssColor(line.textColor) }}
            >
              {line.shortName}
            </span>
            <span aria-hidden>{byLine[line.id] ?? 0}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

interface NetworkSummaryProps extends NetworkFilterProps {
  lines: readonly Line[];
  onShowLine: (lineId: string) => void;
}

/** The map's P+R badge, small, for the legend. */
function ParkAndRideGlyph() {
  return (
    <span
      aria-hidden
      className="flex w-[30px] shrink-0 justify-center rounded border px-0.5 text-[9px] leading-tight font-bold text-white"
      style={{ background: PARK_AND_RIDE_COLOR.available, borderColor: colors.station }}
    >
      {fr.parkAndRide.toggle}
    </span>
  );
}

/** Phones: below Tailwind's `sm` breakpoint, where the map has no room to spare. */
const NARROW_SCREEN = "(max-width: 639px)";

/**
 * Top-left helper: which networks are shown, how many vehicles run per line, how many are late,
 * and how to read the icons. Unfolded at first on wide screens, folded to its heading on phones,
 * its legend folded. It scrolls when the left column (see NetworkView) runs out of height.
 */
export function NetworkSummary({ lines, networks, onChange, onShowLine }: NetworkSummaryProps) {
  const { summary, isLoading, isError, delaysAvailable } = useFleetSummary(networks);
  const shownLines = lines.filter((line) => networks.includes(line.network));
  const detailsRef = useRef<HTMLDetailsElement>(null);
  // Open from the server render on, so wide screens never jump; phones fold it before the first paint.
  useLayoutEffect(() => {
    if (detailsRef.current && window.matchMedia(NARROW_SCREEN).matches) detailsRef.current.open = false;
  }, []);

  const heading = isError ? fr.fleet.unavailable : isLoading ? fr.fleet.loading : fr.fleet.running(summary?.running ?? 0);
  return (
    // The user folds and unfolds it at will.
    <details
      ref={detailsRef}
      open
      className="group min-h-0 shrink overflow-y-auto text-sm shadow-xl backdrop-blur"
      style={{ ...glass, borderRadius: radii.md }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 font-semibold focus-visible:outline-2">
        <span>{heading}</span>
        <span className="transition-transform group-open:rotate-180" style={{ color: colors.textMuted }}>
          <ChevronIcon />
        </span>
      </summary>
      <div className="px-3.5 pb-3.5">
        <SectionTitle>{fr.networks.label}</SectionTitle>
        <NetworkFilter networks={networks} onChange={onChange} />
        {summary && (
          <>
            <SectionTitle>{fr.fleet.byLineTitle}</SectionTitle>
            <LineCounts lines={shownLines} byLine={summary.byLine} onShowLine={onShowLine} />
            <p className="mt-2 text-sm font-medium" style={{ color: summary.late > 0 ? colors.late : colors.textMuted }}>
              {fleetLateText(summary, delaysAvailable)}
            </p>
          </>
        )}
        {/* Read once, then in the way: folded by default. */}
        <details className="group/legend mt-5">
          <summary
            className={`flex cursor-pointer list-none items-center justify-between gap-2 focus-visible:outline-2 ${SECTION_TITLE}`}
            style={{ color: colors.textMuted }}
          >
            {fr.fleet.legendTitle}
            <span className="transition-transform group-open/legend:rotate-180">
              <ChevronIcon />
            </span>
          </summary>
          <ul className="mt-2 space-y-1.5 text-sm" style={{ color: colors.textMuted }}>
            <li className="flex items-center gap-2">
              <LineGlyph />
              {fr.fleet.tramLine}
            </li>
            <li className="flex items-center gap-2">
              <LineGlyph bus />
              {fr.fleet.busLine}
            </li>
            <li className="flex items-center gap-2">
              <DashGlyph color={colors.danger} />
              {fr.disruptions.legendInterrupted}
            </li>
            <li className="flex items-center gap-2">
              <DashGlyph color={colors.warning} />
              {fr.disruptions.legendDisrupted}
            </li>
            <li className="flex items-center gap-2">
              <VehicleGlyph />
              <VehicleGlyph bus />
              {fr.fleet.estimated}
            </li>
            <li className="flex items-center gap-2">
              <VehicleGlyph late />
              {fr.fleet.late}
            </li>
            <li className="flex items-center gap-2">
              <ParkAndRideGlyph />
              {fr.parkAndRide.legend}
            </li>
          </ul>
        </details>
      </div>
    </details>
  );
}
