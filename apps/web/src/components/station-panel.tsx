"use client";

import { useStopAccess } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { radii, toCssColor } from "@greline/theme";
import { CHIP, chip, colors, ICON_BUTTON, panel, SIDE_PANEL } from "@/lib/theme-tokens";
import type { Disruption, Line, Stop, StopAccess } from "@greline/types";
import { useEffect, useRef } from "react";
import { DepartureList } from "./departure-list";
import { DisruptionList } from "./disruption-list";
import { StarIcon, WheelchairIcon } from "./icons";
import { CloseButton, SectionTitle } from "./panel-ui";
import { ShareButton } from "./share-button";
import { useFavorites, useTrip } from "@/lib/personal";
import { sharedSelectionSearch } from "@greline/services";

interface StationPanelProps {
  stop: Stop;
  /** Lines serving the station, in display order. */
  lines: readonly Line[];
  /** Ongoing or later-today disruptions of those lines, information included. */
  disruptions: readonly Disruption[];
  linesById: ReadonlyMap<string, Line>;
  now: Date;
  onShowLine: (lineId: string) => void;
  onClose: () => void;
}

const ACCESS_COLORS: Record<StopAccess, string> = {
  accessible: colors.accent,
  partial: colors.warning,
  inaccessible: colors.textMuted,
};

/** Wheelchair access from the GTFS feed; nothing while unknown. */
function AccessBadge({ stopId }: { stopId: string }) {
  const access = useStopAccess(stopId);
  if (!access) return null;
  const label = fr.station.access[access];
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex" style={{ color: ACCESS_COLORS[access] }}>
      <WheelchairIcon crossed={access === "inaccessible"} />
    </span>
  );
}

/** Details of the selected station. Non-modal: the map stays usable behind it. */
export function StationPanel({ stop, lines, disruptions, linesById, now, onShowLine, onClose }: StationPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { trip, setTrip } = useTrip();
  const favorite = favoriteIds.includes(stop.id);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [stop.id, onClose]);

  return (
    <aside
      aria-labelledby="station-panel-title"
      className={SIDE_PANEL}
      style={panel}
    >
      <div className="flex items-start gap-1">
        <div className="mr-auto min-w-0">
          <h2 id="station-panel-title" className="text-lg font-semibold leading-tight">
            {stop.name}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: colors.textMuted }}>
            {stop.city}
            <AccessBadge stopId={stop.id} />
          </p>
        </div>
        <ShareButton name={stop.name} search={sharedSelectionSearch({ kind: "stop", id: stop.id })} />
        <button
          type="button"
          onClick={() => toggleFavorite(stop.id)}
          aria-pressed={favorite}
          aria-label={favorite ? fr.station.removeFavorite : fr.station.addFavorite}
          title={favorite ? fr.station.removeFavorite : fr.station.addFavorite}
          className={ICON_BUTTON}
          style={{ color: favorite ? colors.warning : colors.textMuted }}
        >
          <StarIcon filled={favorite} />
        </button>
        <CloseButton ref={closeButtonRef} label={fr.station.close} onClick={onClose} />
      </div>
      <SectionTitle>{fr.station.lines}</SectionTitle>
      <ul className="flex flex-wrap gap-2">
        {lines.map((line) => (
          <li key={line.id}>
            <button
              type="button"
              onClick={() => onShowLine(line.id)}
              aria-label={fr.line.open(line.shortName)}
              title={fr.line.open(line.shortName)}
              className="inline-flex h-7 min-w-7 items-center justify-center px-2 text-sm font-bold hover:brightness-110 focus-visible:outline-2"
              style={{ background: toCssColor(line.color), color: toCssColor(line.textColor), borderRadius: radii.pill }}
            >
              {line.shortName}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={trip.from === stop.id}
          onClick={() => setTrip({ from: stop.id, to: trip.to === stop.id ? null : trip.to })}
          className={CHIP}
          style={chip(trip.from === stop.id)}
        >
          {fr.station.tripFrom}
        </button>
        <button
          type="button"
          aria-pressed={trip.to === stop.id}
          onClick={() => setTrip({ from: trip.from === stop.id ? null : trip.from, to: stop.id })}
          className={CHIP}
          style={chip(trip.to === stop.id)}
        >
          {fr.station.tripTo}
        </button>
      </div>
      {disruptions.length > 0 && (
        <>
          <SectionTitle>{fr.disruptions.stationTitle}</SectionTitle>
          <DisruptionList disruptions={disruptions} linesById={linesById} now={now} />
        </>
      )}
      <SectionTitle>{fr.departures.title}</SectionTitle>
      <DepartureList stopId={stop.id} lines={lines} />
    </aside>
  );
}
