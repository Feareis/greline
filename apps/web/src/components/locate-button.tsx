"use client";

import { fr } from "@greline/i18n";
import { type NearbyStop, nearestStops } from "@greline/services";
import { radii } from "@greline/theme";
import type { Stop } from "@greline/types";
import { useState } from "react";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { LocateIcon } from "./icons";

const NEARBY_COUNT = 3;
const GEOLOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 };

/** Where the user is, and the stops closest to them. */
export interface UserLocation {
  lat: number;
  lon: number;
  nearby: NearbyStop[];
}

type LocateState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "failed"; message: string }
  | { status: "located"; nearby: NearbyStop[] };

function failureMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return fr.locate.denied;
  if (error.code === error.TIMEOUT) return fr.locate.timeout;
  return fr.locate.unavailable;
}

interface LocateButtonProps {
  stops: readonly Stop[];
  onSelect: (stopId: string) => void;
  /** The map centers on the location and rings the nearby stops; null clears them. */
  onLocated: (location: UserLocation | null) => void;
}

/** "Locate me": asks for the position only on click, then lists the nearest stops below. */
export function LocateButton({ stops, onSelect, onLocated }: LocateButtonProps) {
  const [state, setState] = useState<LocateState>({ status: "idle" });

  const locate = () => {
    // Also covers insecure (http) pages, where browsers hide the geolocation API.
    if (!("geolocation" in navigator)) {
      setState({ status: "failed", message: fr.locate.unsupported });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: coords.latitude, lon: coords.longitude };
        const nearby = nearestStops(here, stops, NEARBY_COUNT);
        setState({ status: "located", nearby });
        onLocated({ ...here, nearby });
      },
      (error) => {
        setState({ status: "failed", message: failureMessage(error) });
        onLocated(null);
      },
      GEOLOCATION_OPTIONS,
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={locate}
        disabled={state.status === "locating"}
        aria-label={state.status === "locating" ? fr.locate.locating : fr.locate.button}
        className={FLOATING_BUTTON}
        style={glass}
      >
        <LocateIcon />
        <span className="hidden sm:inline">{state.status === "locating" ? fr.locate.locating : fr.locate.button}</span>
      </button>
      <div className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)]">
        {state.status === "failed" && (
          <p role="alert" className="p-3 text-sm shadow-lg" style={{ ...glass, borderRadius: radii.md }}>
            {state.message}
          </p>
        )}
        {state.status === "located" && (
          <section aria-live="polite" className="p-3 shadow-lg backdrop-blur" style={{ ...glass, borderRadius: radii.md }}>
            <h2 className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
              {fr.locate.nearestTitle}
            </h2>
            <ol className="mt-2 space-y-1">
              {state.nearby.map(({ stop, distanceMeters }) => (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(stop.id)}
                    className="flex w-full justify-between gap-2 rounded px-1 py-0.5 text-left text-sm hover:opacity-80 focus-visible:outline-2"
                  >
                    <span className="truncate">{stop.name}</span>
                    <span style={{ color: colors.textMuted }}>{fr.locate.distance(distanceMeters)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
