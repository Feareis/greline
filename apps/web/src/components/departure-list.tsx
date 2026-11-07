"use client";

import { useDepartures, useNow } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { departureCountdown, formatClockTime, GrelineApiError, groupDepartures, type TripLeg, tripDepartures } from "@greline/services";
import { radii, toCssColor } from "@greline/theme";
import { colors } from "@/lib/theme-tokens";
import type { Departure, Line } from "@greline/types";
import type { ReactNode } from "react";
import { LineChip } from "./disruption-list";

const DEPARTURES_PER_DIRECTION = 3;
const COMPACT_PER_DIRECTION = 2;
const TRIP_DEPARTURES = 4;
const COUNTDOWN_TICK_MS = 5_000;

function countdownLabel(departure: Departure, now: Date): string {
  const countdown = departureCountdown(departure.departureTime, now);
  if (countdown.kind === "approaching") return fr.departures.approaching;
  if (countdown.kind === "minutes") return fr.departures.minutes(countdown.minutes);
  return countdown.time;
}

function DepartureTime({ departure, now }: { departure: Departure; now: Date }) {
  const sourceLabel = departure.realtime ? fr.departures.realtime : fr.departures.scheduled;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={sourceLabel}>
      {departure.realtime ? (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse" style={{ background: colors.accent }} />
      ) : (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: colors.textMuted }} />
      )}
      <span style={{ color: departure.realtime ? colors.text : colors.textMuted }}>{countdownLabel(departure, now)}</span>
      <span className="sr-only">({sourceLabel})</span>
    </span>
  );
}

function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>
      {children}
    </p>
  );
}

/** Live departures of a station, grouped by line then direction, refreshed every 15 s. */
export function DepartureList({ stopId, lines }: { stopId: string; lines: readonly Line[] }) {
  const { data, error, isPending, dataUpdatedAt, refetch } = useDepartures(stopId);
  const now = useNow(COUNTDOWN_TICK_MS);
  const updatedAt = dataUpdatedAt ? formatClockTime(new Date(dataUpdatedAt)) : null;

  if (isPending) return <StatusMessage>{fr.departures.loading}</StatusMessage>;

  if (!data) {
    const unknownStop = error instanceof GrelineApiError && error.code === "unknown_stop";
    return (
      <div role="alert">
        <StatusMessage>{unknownStop ? fr.departures.unknownStop : fr.departures.unavailable}</StatusMessage>
        {!unknownStop && (
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 px-3 py-1 text-sm font-medium focus-visible:outline-2"
            style={{ background: colors.background, color: colors.text, borderRadius: radii.sm }}
          >
            {fr.departures.retry}
          </button>
        )}
      </div>
    );
  }

  const groups = groupDepartures(data, lines);
  return (
    <div>
      {groups.length === 0 && <StatusMessage>{fr.departures.empty}</StatusMessage>}
      <ul className="mt-2 space-y-3">
        {groups.map(({ line, directions }) => (
          <li key={line.id} className="flex gap-3">
            <span
              aria-label={fr.station.line(line.shortName)}
              className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center px-1.5 text-xs font-bold"
              style={{ background: toCssColor(line.color), color: toCssColor(line.textColor), borderRadius: radii.pill }}
            >
              {line.shortName}
            </span>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {directions.map(({ headsign, departures }) => (
                <li key={headsign} className="text-sm">
                  <p className="truncate font-medium">{fr.departures.direction(headsign)}</p>
                  <p className="flex flex-wrap gap-x-3">
                    {departures.slice(0, DEPARTURES_PER_DIRECTION).map((departure, i) => (
                      <DepartureTime key={`${departure.departureTime}-${i}`} departure={departure} now={now} />
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-3 text-xs" style={{ color: colors.textMuted }}>
        {error && updatedAt ? fr.departures.staleWarning(updatedAt) : updatedAt && fr.departures.updatedAt(updatedAt)}
      </p>
    </div>
  );
}

/** One row per line and direction with its next two departures: for the favorite stops. */
export function CompactDepartures({ stopId, lines }: { stopId: string; lines: readonly Line[] }) {
  const { data, isPending } = useDepartures(stopId);
  const now = useNow(COUNTDOWN_TICK_MS);
  if (isPending) return <StatusMessage>{fr.departures.loading}</StatusMessage>;
  if (!data) return <StatusMessage>{fr.departures.unavailable}</StatusMessage>;
  const rows = groupDepartures(data, lines).flatMap(({ line, directions }) => directions.map((direction) => ({ line, ...direction })));
  if (rows.length === 0) return <StatusMessage>{fr.departures.empty}</StatusMessage>;
  return (
    <ul className="mt-1.5 space-y-1">
      {rows.map(({ line, headsign, departures }) => (
        <li key={`${line.id}-${headsign}`} className="flex items-center gap-2 text-xs">
          <LineChip line={line} />
          <span className="min-w-0 flex-1 truncate">{fr.departures.direction(headsign)}</span>
          {departures.slice(0, COMPACT_PER_DIRECTION).map((departure, i) => (
            <DepartureTime key={`${departure.departureTime}-${i}`} departure={departure} now={now} />
          ))}
        </li>
      ))}
    </ul>
  );
}

/** Next departures at the trip's start on the lines that reach its end without changing. */
export function TripDepartureList({ stopId, legs, lines }: { stopId: string; legs: readonly TripLeg[]; lines: readonly Line[] }) {
  const { data, isPending } = useDepartures(stopId);
  const now = useNow(COUNTDOWN_TICK_MS);
  if (isPending) return <StatusMessage>{fr.departures.loading}</StatusMessage>;
  if (!data) return <StatusMessage>{fr.departures.unavailable}</StatusMessage>;
  const departures = tripDepartures(data, legs).slice(0, TRIP_DEPARTURES);
  if (departures.length === 0) return <StatusMessage>{fr.departures.empty}</StatusMessage>;
  const linesById = new Map(lines.map((line) => [line.id, line]));
  return (
    <ul className="space-y-1">
      {departures.map((departure, i) => {
        const line = linesById.get(departure.lineId);
        return (
          <li key={`${departure.lineId}-${departure.departureTime}-${i}`} className="flex items-center gap-2 text-xs">
            {line && <LineChip line={line} />}
            <span className="min-w-0 flex-1 truncate">{fr.departures.direction(departure.headsign)}</span>
            <DepartureTime departure={departure} now={now} />
          </li>
        );
      })}
    </ul>
  );
}
