"use client";

import { fr } from "@greline/i18n";
import { radii, toCssColor } from "@greline/theme";
import { colors } from "@/lib/theme-tokens";
import type { Disruption, Line, Stop } from "@greline/types";
import { useEffect, useRef } from "react";
import { DepartureList } from "./departure-list";
import { DisruptionList } from "./disruption-list";
import { StarIcon } from "./icons";
import { useFavorites, useTrip } from "@/lib/personal";

interface StationPanelProps {
  stop: Stop;
  /** Lines serving the station, in display order. */
  lines: readonly Line[];
  /** Ongoing or later-today disruptions of those lines, information included. */
  disruptions: readonly Disruption[];
  linesById: ReadonlyMap<string, Line>;
  now: Date;
  onClose: () => void;
}

/** Details of the selected station. Non-modal: the map stays usable behind it. */
export function StationPanel({ stop, lines, disruptions, linesById, now, onClose }: StationPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { trip, setTrip } = useTrip();
  const favorite = favoriteIds.includes(stop.id);
  const tripChip = (pressed: boolean) => ({
    background: pressed ? colors.accent : "transparent",
    color: pressed ? colors.background : colors.text,
    borderColor: pressed ? colors.accent : colors.textMuted,
  });

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [stop.id, onClose]);

  return (
    <aside
      aria-labelledby="station-panel-title"
      className="absolute inset-x-3 bottom-3 z-10 max-h-[60%] overflow-y-auto p-4 shadow-2xl sm:inset-x-auto sm:right-3 sm:top-16 sm:bottom-auto sm:w-80"
      style={{ background: colors.surface, color: colors.text, borderRadius: radii.md }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="station-panel-title" className="text-lg font-semibold leading-tight">
            {stop.name}
          </h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            {stop.city}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(stop.id)}
          aria-pressed={favorite}
          aria-label={favorite ? fr.station.removeFavorite : fr.station.addFavorite}
          title={favorite ? fr.station.removeFavorite : fr.station.addFavorite}
          className="-m-1 ml-auto rounded p-1 leading-none hover:opacity-80 focus-visible:outline-2"
          style={{ color: favorite ? colors.warning : colors.textMuted }}
        >
          <StarIcon filled={favorite} />
        </button>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={fr.station.close}
          className="-m-1 rounded p-1 text-xl leading-none hover:opacity-80 focus-visible:outline-2"
          style={{ color: colors.textMuted }}
        >
          ×
        </button>
      </div>
      <h3 className="mt-4 text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
        {fr.station.lines}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {lines.map((line) => (
          <li key={line.id}>
            <span
              aria-label={fr.station.line(line.shortName)}
              className="inline-flex h-7 min-w-7 items-center justify-center px-2 text-sm font-bold"
              style={{ background: toCssColor(line.color), color: toCssColor(line.textColor), borderRadius: radii.pill }}
            >
              {line.shortName}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={trip.from === stop.id}
          onClick={() => setTrip({ from: stop.id, to: trip.to === stop.id ? null : trip.to })}
          className="rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-2"
          style={tripChip(trip.from === stop.id)}
        >
          {fr.station.tripFrom}
        </button>
        <button
          type="button"
          aria-pressed={trip.to === stop.id}
          onClick={() => setTrip({ from: trip.from === stop.id ? null : trip.from, to: stop.id })}
          className="rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-2"
          style={tripChip(trip.to === stop.id)}
        >
          {fr.station.tripTo}
        </button>
      </div>
      {disruptions.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
            {fr.disruptions.stationTitle}
          </h3>
          <DisruptionList disruptions={disruptions} linesById={linesById} now={now} />
        </>
      )}
      <h3 className="mt-5 text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
        {fr.departures.title}
      </h3>
      <DepartureList stopId={stop.id} lines={lines} />
    </aside>
  );
}
