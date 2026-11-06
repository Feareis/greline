"use client";

import { useFleetSummary } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { radii, toCssColor } from "@greline/theme";
import type { Line } from "@greline/types";
import { useEffect, useRef } from "react";
import { colors, glass } from "@/lib/theme-tokens";

const SECONDS_PER_MINUTE = 60;

/** The map's tram icon, small, for the legend. */
function TramGlyph({ late }: { late: boolean }) {
  return (
    <svg width="30" height="12" viewBox="0 0 50 20" aria-hidden className="shrink-0">
      <path
        d="M5 4h33c4.4 0 9 2.7 9 6s-4.6 6-9 6H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        fill={colors.textMuted}
        stroke={late ? colors.late : colors.station}
        strokeWidth={late ? 3 : 1.5}
      />
    </svg>
  );
}

function LineCounts({ lines, byLine }: { lines: readonly Line[]; byLine: Readonly<Record<string, number>> }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {lines.map((line) => (
        <li
          key={line.id}
          aria-label={fr.trams.lineCount(line.shortName, byLine[line.id] ?? 0)}
          className="flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 text-xs font-medium"
          style={{ background: `color-mix(in srgb, ${toCssColor(line.color)} 18%, transparent)` }}
        >
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: toCssColor(line.color), color: toCssColor(line.textColor) }}
          >
            {line.shortName}
          </span>
          <span aria-hidden>{byLine[line.id] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Top-left helper: how many trams run, per line, how many are late, and how to read the icons.
 * Folded into a pill on small screens so the map stays visible.
 */
export function TramSummary({ lines }: { lines: readonly Line[] }) {
  const { summary, isLoading, isError, delaysAvailable } = useFleetSummary();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (detailsRef.current && window.matchMedia("(min-width: 640px)").matches) detailsRef.current.open = true;
  }, []);

  if (isError) {
    return (
      <p className="absolute top-16 left-3 z-10 px-3 py-2 text-xs shadow-lg" style={{ ...glass, borderRadius: radii.md }}>
        {fr.trams.unavailable}
      </p>
    );
  }
  return (
    <details
      ref={detailsRef}
      className="group absolute top-16 left-3 z-10 w-64 max-w-[calc(100vw-1.5rem)] text-sm shadow-lg backdrop-blur"
      style={{ ...glass, borderRadius: radii.md }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium focus-visible:outline-2">
        <span>{isLoading ? fr.trams.loading : fr.trams.running(summary?.running ?? 0)}</span>
        <span className="transition-transform group-open:rotate-180" style={{ color: colors.textMuted }}>
          <ChevronIcon />
        </span>
      </summary>
      {summary && (
        <div className="px-3 pb-3">
          <LineCounts lines={lines} byLine={summary.byLine} />
          <p className="mt-2 text-xs" style={{ color: summary.late > 0 ? colors.late : colors.textMuted }}>
            {delaysAvailable
              ? fr.trams.lateSummary(summary.late, Math.round(summary.averageLateSeconds / SECONDS_PER_MINUTE))
              : fr.trams.delaysUnavailable}
          </p>
          <ul className="mt-2 space-y-1 text-xs" style={{ color: colors.textMuted }}>
            <li className="flex items-center gap-2">
              <TramGlyph late={false} />
              {fr.trams.estimated}
            </li>
            <li className="flex items-center gap-2">
              <TramGlyph late />
              {fr.trams.late}
            </li>
          </ul>
        </div>
      )}
    </details>
  );
}
