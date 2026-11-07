"use client";

import { NO_TRIP, parseFavorites, parseTrip, type SavedTrip, toggleFavorite } from "@greline/services";
import { storedValue, useStoredValue } from "./stored-value";

const NO_FAVORITES: readonly string[] = [];

/** Favorite stops and the usual trip: kept on this device only, no account. */
const favorites = storedValue<readonly string[]>("greline-favorites", parseFavorites, NO_FAVORITES);
const trip = storedValue<SavedTrip>("greline-trip", parseTrip, NO_TRIP);

export function useFavorites() {
  const ids = useStoredValue(favorites);
  return { favoriteIds: ids, toggleFavorite: (stopId: string) => favorites.set(toggleFavorite(favorites.get(), stopId)) };
}

export function useTrip() {
  const value = useStoredValue(trip);
  return {
    trip: value,
    setTrip: (next: SavedTrip) => trip.set(next),
    swapTrip: () => trip.set({ from: trip.get().to, to: trip.get().from }),
  };
}
