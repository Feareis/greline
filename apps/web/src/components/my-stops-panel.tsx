"use client";

import { fr } from "@greline/i18n";
import { directTripLegs, NO_TRIP } from "@greline/services";
import type { TransitNetwork } from "@greline/types";
import { useMemo } from "react";
import { useFavorites, useTrip } from "@/lib/personal";
import { colors, ICON_BUTTON, panel, SIDE_PANEL } from "@/lib/theme-tokens";
import { CompactDepartures, TripDepartureList } from "./departure-list";
import { StarIcon } from "./icons";
import { ItineraryList } from "./itinerary-list";
import { CloseButton, SectionTitle } from "./panel-ui";

const smallButton = "rounded-full px-3 py-1 text-sm font-medium hover:opacity-80 focus-visible:outline-2";

interface MyStopsPanelProps {
  network: TransitNetwork;
  /** Opens a stop's panel and centers the map on it. */
  onShowStop: (stopId: string) => void;
  onClose: () => void;
}

function TripSection({ network, onShowStop }: Omit<MyStopsPanelProps, "onClose">) {
  const { trip, setTrip, swapTrip } = useTrip();
  const nameOf = (id: string) => network.stops.find((stop) => stop.id === id)?.name ?? id;
  const legs = useMemo(
    () => (trip.from && trip.to ? directTripLegs(network.lines, trip.from, trip.to) : []),
    [network.lines, trip.from, trip.to],
  );
  const muted = { color: colors.textMuted };

  if (!trip.from && !trip.to) return <p className="text-sm" style={muted}>{fr.mine.noTrip}</p>;
  if (!trip.from || !trip.to) {
    return (
      <div className="space-y-2 text-sm">
        <p style={muted}>{trip.from ? fr.mine.tripStartOnly(nameOf(trip.from)) : fr.mine.tripEndOnly(nameOf(trip.to!))}</p>
        <button type="button" onClick={() => setTrip(NO_TRIP)} className={smallButton} style={{ background: colors.background }}>
          {fr.mine.clearTrip}
        </button>
      </div>
    );
  }
  const from = trip.from;
  const lines = network.lines.filter((line) => legs.some((leg) => leg.lineId === line.id));
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => onShowStop(from)} className="text-left text-sm font-semibold hover:underline focus-visible:outline-2">
        {fr.mine.tripRoute(nameOf(from), nameOf(trip.to))}
      </button>
      {legs.length > 0 ? (
        <TripDepartureList stopId={from} legs={legs} lines={lines} />
      ) : (
        <p className="text-sm" style={muted}>{fr.mine.noDirectLine}</p>
      )}
      <h4 className="pt-2 text-sm font-medium" style={muted}>
        {fr.mine.itinerariesTitle}
      </h4>
      <ItineraryList from={from} to={trip.to} />
      <div className="flex gap-2">
        <button type="button" onClick={swapTrip} className={smallButton} style={{ background: colors.background }}>
          {fr.mine.swap}
        </button>
        <button type="button" onClick={() => setTrip(NO_TRIP)} className={smallButton} style={{ background: colors.background }}>
          {fr.mine.clearTrip}
        </button>
      </div>
    </div>
  );
}

function FavoritesSection({ network, onShowStop }: Omit<MyStopsPanelProps, "onClose">) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const favorites = favoriteIds.flatMap((id) => network.stops.find((stop) => stop.id === id) ?? []);
  if (favorites.length === 0) return <p className="text-sm" style={{ color: colors.textMuted }}>{fr.mine.noFavorites}</p>;
  return (
    <ul className="space-y-4">
      {favorites.map((stop) => (
        <li key={stop.id}>
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onShowStop(stop.id)}
              aria-label={fr.mine.showOnMap(stop.name)}
              className="text-left text-sm font-semibold hover:underline focus-visible:outline-2"
            >
              {stop.name}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(stop.id)}
              aria-label={fr.mine.removeFavorite(stop.name)}
              title={fr.mine.removeFavorite(stop.name)}
              className={ICON_BUTTON}
              style={{ color: colors.warning }}
            >
              <StarIcon filled />
            </button>
          </div>
          <CompactDepartures stopId={stop.id} lines={network.lines.filter((line) => line.stopIds.includes(stop.id))} />
        </li>
      ))}
    </ul>
  );
}

/** "Home screen": the usual trip with its direct departures, then each favorite stop's next departures. */
export function MyStopsPanel({ network, onShowStop, onClose }: MyStopsPanelProps) {
  return (
    <aside
      aria-labelledby="my-stops-title"
      className={SIDE_PANEL}
      style={panel}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="my-stops-title" className="text-lg font-semibold leading-tight">
          {fr.mine.button}
        </h2>
        <CloseButton label={fr.mine.close} onClick={onClose} />
      </div>
      <SectionTitle>{fr.mine.tripTitle}</SectionTitle>
      <TripSection network={network} onShowStop={onShowStop} />
      <SectionTitle>{fr.mine.favoritesTitle}</SectionTitle>
      <FavoritesSection network={network} onShowStop={onShowStop} />
    </aside>
  );
}
