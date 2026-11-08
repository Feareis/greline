"use client";

import { useFleetSummary } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { radii, toCssColor } from "@greline/theme";
import { type Line, NETWORK_IDS, type NetworkId } from "@greline/types";
import { useEffect, useRef } from "react";
import { colors, glass } from "@/lib/theme-tokens";

const SECONDS_PER_MINUTE = 60;

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

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="m6 9 6 6 6-6" />
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
  const chip = (pressed: boolean) => ({
    background: pressed ? colors.accent : "transparent",
    color: pressed ? colors.background : colors.text,
    borderColor: pressed ? colors.accent : colors.textMuted,
  });
  const all = networks.length === NETWORK_IDS.length;
  return (
    <div role="group" aria-label={fr.networks.label} className="flex flex-wrap gap-1.5">
      {NETWORK_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={networks.includes(id)}
          onClick={() => toggle(id)}
          className="rounded-full border px-2.5 py-0.5 text-xs font-medium focus-visible:outline-2"
          style={chip(networks.includes(id))}
        >
          {fr.networks.names[id]}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={all}
        onClick={() => onChange(NETWORK_IDS)}
        className="rounded-full border px-2.5 py-0.5 text-xs font-medium focus-visible:outline-2"
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
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {lines.map((line) => (
        <li key={line.id}>
          <button
            type="button"
            onClick={() => onShowLine(line.id)}
            aria-label={`${fr.fleet.lineCount(line.shortName, byLine[line.id] ?? 0)}. ${fr.line.open(line.shortName)}`}
            title={fr.line.open(line.shortName)}
            className="flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 text-xs font-medium hover:opacity-80 focus-visible:outline-2"
            style={{ background: `color-mix(in srgb, ${toCssColor(line.color)} 18%, transparent)` }}
          >
            <span
              aria-hidden
              className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold"
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

/**
 * Top-left helper: which networks are shown, how many vehicles run per line, how many are late,
 * and how to read the icons. Folded into a pill on small screens so the map stays visible.
 */
export function NetworkSummary({ lines, networks, onChange, onShowLine }: NetworkSummaryProps) {
  const { summary, isLoading, isError, delaysAvailable } = useFleetSummary(networks);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const shownLines = lines.filter((line) => networks.includes(line.network));

  useEffect(() => {
    if (detailsRef.current && window.matchMedia("(min-width: 640px)").matches) detailsRef.current.open = true;
  }, []);

  const heading = isError ? fr.fleet.unavailable : isLoading ? fr.fleet.loading : fr.fleet.running(summary?.running ?? 0);
  return (
    <details
      ref={detailsRef}
      className="group absolute top-16 left-3 z-10 max-h-[calc(100dvh-14rem)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto text-sm shadow-lg backdrop-blur"
      style={{ ...glass, borderRadius: radii.md }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium focus-visible:outline-2">
        <span>{heading}</span>
        <span className="transition-transform group-open:rotate-180" style={{ color: colors.textMuted }}>
          <ChevronIcon />
        </span>
      </summary>
      <div className="px-3 pb-3">
        <NetworkFilter networks={networks} onChange={onChange} />
        {summary && (
          <>
            <LineCounts lines={shownLines} byLine={summary.byLine} onShowLine={onShowLine} />
            <p className="mt-2 text-xs" style={{ color: summary.late > 0 ? colors.late : colors.textMuted }}>
              {delaysAvailable
                ? fr.fleet.lateSummary(summary.late, Math.round(summary.averageLateSeconds / SECONDS_PER_MINUTE))
                : fr.fleet.delaysUnavailable}
            </p>
          </>
        )}
        <ul className="mt-2 space-y-1 text-xs" style={{ color: colors.textMuted }}>
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
        </ul>
      </div>
    </details>
  );
}
