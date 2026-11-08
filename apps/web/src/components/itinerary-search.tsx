"use client";

import { fr } from "@greline/i18n";
import { isWithinServiceArea, itineraryEndParam } from "@greline/services";
import { radii } from "@greline/theme";
import type { ItineraryEnd, TransitNetwork } from "@greline/types";
import { useState } from "react";
import { currentPosition } from "@/lib/geolocation";
import { colors } from "@/lib/theme-tokens";
import { LocateIcon } from "./icons";
import { ItineraryList } from "./itinerary-list";
import { NetworkCombobox } from "./network-combobox";

/** One chosen end of the search, with the name to show for it. */
export interface ItineraryEndChoice {
  end: ItineraryEnd;
  name: string;
}

export interface ItineraryEnds {
  from: ItineraryEndChoice | null;
  to: ItineraryEndChoice | null;
}

export const NO_ENDS: ItineraryEnds = { from: null, to: null };

const smallButton = "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium hover:opacity-80 focus-visible:outline-2 disabled:opacity-60";

/** "Ma position" for the start: asks for the position on click, refused far from the network. */
function MyPositionButton({ network, onPick }: { network: TransitNetwork; onPick: (choice: ItineraryEndChoice) => void }) {
  const [state, setState] = useState<{ locating: boolean; error: string | null }>({ locating: false, error: null });
  const locate = async () => {
    setState({ locating: true, error: null });
    try {
      const here = await currentPosition();
      if (!isWithinServiceArea(here, network.stops)) {
        setState({ locating: false, error: fr.itinerary.farFromNetwork });
        return;
      }
      setState({ locating: false, error: null });
      onPick({ end: { kind: "position", ...here }, name: fr.itinerary.myPosition });
    } catch (error) {
      setState({ locating: false, error: error instanceof Error ? error.message : fr.locate.unavailable });
    }
  };
  return (
    <>
      <button type="button" onClick={locate} disabled={state.locating} className={`mt-1 ${smallButton}`} style={{ color: colors.accent }}>
        <LocateIcon />
        {state.locating ? fr.itinerary.locating : fr.itinerary.myPosition}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs" style={{ color: colors.danger }}>
          {state.error}
        </p>
      )}
    </>
  );
}

interface EndFieldProps {
  label: string;
  placeholder: string;
  network: TransitNetwork;
  value: ItineraryEndChoice | null;
  onChange: (choice: ItineraryEndChoice | null) => void;
  withPosition: boolean;
}

/** One end: the chosen place with a clear button, or a stop field (and "Ma position"). */
function EndField({ label, placeholder, network, value, onChange, withPosition }: EndFieldProps) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
        {label}
      </p>
      {value ? (
        <p className="flex items-center justify-between gap-2 border px-3 py-1.5 text-sm" style={{ borderColor: colors.textMuted, borderRadius: radii.md }}>
          <span className="truncate font-medium">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={fr.itinerary.clear(label, value.name)}
            className="-m-1 rounded p-1 text-lg leading-none hover:opacity-80 focus-visible:outline-2"
            style={{ color: colors.textMuted }}
          >
            ×
          </button>
        </p>
      ) : (
        <>
          <NetworkCombobox
            network={network}
            label={label}
            placeholder={placeholder}
            withLines={false}
            onPick={(result) => {
              if (result.kind === "stop") onChange({ end: { kind: "stop", stopId: result.stop.id }, name: result.stop.name });
            }}
          />
          {withPosition && <MyPositionButton network={network} onPick={onChange} />}
        </>
      )}
    </div>
  );
}

interface ItinerarySearchProps {
  network: TransitNetwork;
  ends: ItineraryEnds;
  onChange: (ends: ItineraryEnds) => void;
}

/** Any start (a stop or the user's position) to any stop, leaving now, through the M planner. */
export function ItinerarySearch({ network, ends, onChange }: ItinerarySearchProps) {
  const { from, to } = ends;
  return (
    <div className="space-y-3">
      <EndField
        label={fr.itinerary.from}
        placeholder={fr.itinerary.fromPlaceholder}
        network={network}
        value={from}
        onChange={(choice) => onChange({ from: choice, to })}
        withPosition
      />
      <EndField
        label={fr.itinerary.to}
        placeholder={fr.itinerary.toPlaceholder}
        network={network}
        value={to}
        onChange={(choice) => onChange({ from, to: choice })}
        withPosition={false}
      />
      {/* "Ma position" only makes sense as a start: swapping is offered between two stops. */}
      {from?.end.kind === "stop" && to && (
        <button type="button" onClick={() => onChange({ from: to, to: from })} className={smallButton} style={{ background: colors.background }}>
          {fr.itinerary.swap}
        </button>
      )}
      {from && to ? (
        <ItineraryList from={itineraryEndParam(from.end)} to={itineraryEndParam(to.end)} />
      ) : (
        <p className="text-sm" style={{ color: colors.textMuted }}>
          {fr.itinerary.pickBoth}
        </p>
      )}
    </div>
  );
}
