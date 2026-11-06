"use client";

import { fr } from "@greline/i18n";
import { nearestStops, type NearbyStop } from "@greline/services";
import { colors, radii } from "@greline/theme";
import type { Stop } from "@greline/types";
import { useState } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";

const NEARBY_COUNT = 3;
const LOCATED_ZOOM = 15;
const GEOLOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 };

type LocateState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "failed"; message: string }
  | { status: "located"; lat: number; lon: number; nearby: NearbyStop[] };

function failureMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return fr.locate.denied;
  if (error.code === error.TIMEOUT) return fr.locate.timeout;
  return fr.locate.unavailable;
}

interface LocateButtonProps {
  stops: readonly Stop[];
  onSelect: (stopId: string) => void;
  /** Reports the highlighted stops so the map can ring them. */
  onNearbyChange: (stopIds: ReadonlySet<string>) => void;
}

/** "Locate me": asks for the position only on click, centers the map and lists the nearest stops. */
export function LocateButton({ stops, onSelect, onNearbyChange }: LocateButtonProps) {
  const { current: map } = useMap();
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
        setState({ status: "located", ...here, nearby });
        onNearbyChange(new Set(nearby.map((n) => n.stop.id)));
        map?.flyTo({ center: [here.lon, here.lat], zoom: LOCATED_ZOOM });
      },
      (error) => {
        setState({ status: "failed", message: failureMessage(error) });
        onNearbyChange(new Set());
      },
      GEOLOCATION_OPTIONS,
    );
  };

  return (
    <>
      <div className="absolute top-16 left-3 z-10 w-64 space-y-2">
        <button
          type="button"
          onClick={locate}
          disabled={state.status === "locating"}
          className="px-4 py-2 text-sm font-medium shadow-lg focus-visible:outline-2 disabled:opacity-60"
          style={{ background: colors.surface, color: colors.text, borderRadius: radii.pill }}
        >
          {state.status === "locating" ? fr.locate.locating : fr.locate.button}
        </button>
        {state.status === "failed" && (
          <p role="alert" className="p-3 text-sm shadow-lg" style={{ background: colors.surface, color: colors.text, borderRadius: radii.md }}>
            {state.message}
          </p>
        )}
        {state.status === "located" && (
          <section aria-live="polite" className="p-3 shadow-lg" style={{ background: colors.surface, borderRadius: radii.md }}>
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
                    style={{ color: colors.text }}
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
      {state.status === "located" && (
        <Marker longitude={state.lon} latitude={state.lat} anchor="center">
          <span
            role="img"
            aria-label={fr.locate.youAreHere}
            title={fr.locate.youAreHere}
            className="block h-4 w-4 rounded-full border-2"
            style={{ background: colors.accent, borderColor: colors.station }}
          />
        </Marker>
      )}
    </>
  );
}
