"use client";

import { fr } from "@greline/i18n";
import { type NearbyStop, nearestStops } from "@greline/services";
import { radii } from "@greline/theme";
import type { Stop } from "@greline/types";
import { useState } from "react";
import { currentPosition } from "@/lib/geolocation";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { LocateIcon } from "./icons";
import { CloseButton } from "./panel-ui";

const NEARBY_COUNT = 3;

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

interface LocateButtonProps {
  stops: readonly Stop[];
  onSelect: (stopId: string) => void;
  /** The map centers on the location and rings the nearby stops; null clears them. */
  onLocated: (location: UserLocation | null) => void;
}

/** "Locate me": asks for the position only on click, then lists the nearest stops below. */
export function LocateButton({ stops, onSelect, onLocated }: LocateButtonProps) {
  const [state, setState] = useState<LocateState>({ status: "idle" });

  const locate = async () => {
    setState({ status: "locating" });
    try {
      const here = await currentPosition();
      const nearby = nearestStops(here, stops, NEARBY_COUNT);
      setState({ status: "located", nearby });
      onLocated({ ...here, nearby });
    } catch (error) {
      setState({ status: "failed", message: error instanceof Error ? error.message : fr.locate.unavailable });
      onLocated(null);
    }
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
          <div role="alert" className="flex items-start gap-1 py-2 pr-1.5 pl-3 text-sm shadow-lg" style={{ ...glass, borderRadius: radii.md }}>
            <p className="py-1.5">{state.message}</p>
            <CloseButton label={fr.locate.close} onClick={() => setState({ status: "idle" })} />
          </div>
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
