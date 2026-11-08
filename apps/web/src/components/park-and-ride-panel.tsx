"use client";

import { useParkAndRides } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { parkAndRideLevel } from "@greline/services";
import { radii } from "@greline/theme";
import type { ParkAndRide } from "@greline/types";
import { useState } from "react";
import { colors, glass } from "@/lib/theme-tokens";
import { ChevronIcon } from "./icons";
import { PARK_AND_RIDE_COLOR } from "./park-and-ride-markers";
import { SectionTitle } from "./panel-ui";

const byName = (a: ParkAndRide, b: ParkAndRide) => a.name.localeCompare(b.name, "fr");
const muted = { color: colors.textMuted };

/** On/off switch: the accent color when on, the knob on the right. */
function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2"
      style={{ background: checked ? colors.accent : `color-mix(in srgb, ${colors.textMuted} 45%, transparent)` }}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        style={{ background: colors.station }}
      />
    </button>
  );
}

/** A counted P+R: its name, its free spaces, and a bar filled as much as the car park is. */
function CountedRow({ parkAndRide }: { parkAndRide: ParkAndRide }) {
  const free = parkAndRide.free ?? 0;
  const filled = Math.round(((parkAndRide.capacity - free) / parkAndRide.capacity) * 100);
  return (
    <li>
      <p className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{parkAndRide.name}</span>
        <span className="shrink-0 text-xs tabular-nums" style={muted}>
          {fr.parkAndRide.freeShort(free, parkAndRide.capacity)}
        </span>
      </p>
      <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${colors.textMuted} 25%, transparent)` }}>
        <div className="h-full rounded-full" style={{ width: `${filled}%`, background: PARK_AND_RIDE_COLOR[parkAndRideLevel(parkAndRide)] }} />
      </div>
    </li>
  );
}

function ParkAndRideList({ parkAndRides }: { parkAndRides: readonly ParkAndRide[] }) {
  const counted = parkAndRides.filter((p) => p.free !== null).sort(byName);
  const uncounted = parkAndRides.filter((p) => p.free === null).sort(byName);
  return (
    <>
      <SectionTitle>{fr.parkAndRide.liveTitle}</SectionTitle>
      <p className="-mt-1 mb-2 text-xs" style={muted}>
        {fr.parkAndRide.barHint}
      </p>
      <ul className="space-y-2.5">
        {counted.map((parkAndRide) => (
          <CountedRow key={parkAndRide.id} parkAndRide={parkAndRide} />
        ))}
      </ul>
      <SectionTitle>{fr.parkAndRide.staticTitle}</SectionTitle>
      <ul className="space-y-1">
        {uncounted.map((parkAndRide) => (
          <li key={parkAndRide.id} className="flex items-baseline justify-between gap-2">
            <span className="truncate">{parkAndRide.name}</span>
            <span className="shrink-0 text-xs tabular-nums" style={muted}>
              {fr.parkAndRide.capacityShort(parkAndRide.capacity)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

interface ParkAndRidePanelProps {
  /** Whether the P+R badges are on the map. */
  shown: boolean;
  onShownChange: (shown: boolean) => void;
}

/**
 * Under the network panel: a switch for the P+R badges on the map, and a list of every P+R with
 * how full it is. The list is folded at first and only fetched once unfolded.
 */
export function ParkAndRidePanel({ shown, onShownChange }: ParkAndRidePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: parkAndRides, isError } = useParkAndRides(expanded);
  return (
    <section
      aria-labelledby="park-and-ride-title"
      className="flex min-h-0 shrink flex-col text-sm shadow-xl backdrop-blur"
      style={{ ...glass, borderRadius: radii.md }}
    >
      <div className="flex items-center gap-2 py-2 pr-2.5 pl-3.5">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="park-and-ride-list"
          title={expanded ? fr.parkAndRide.hideList : fr.parkAndRide.showList}
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left font-semibold focus-visible:outline-2"
        >
          <span id="park-and-ride-title">{fr.parkAndRide.panelTitle}</span>
          <span className={`transition-transform ${expanded ? "rotate-180" : ""}`} style={muted}>
            <ChevronIcon />
          </span>
        </button>
        <Switch checked={shown} label={fr.parkAndRide.toggleLabel} onChange={onShownChange} />
      </div>
      {expanded && (
        <div id="park-and-ride-list" className="max-h-[min(16rem,40dvh)] min-h-0 overflow-y-auto px-3.5 pb-3.5">
          {isError ? (
            <p style={muted}>{fr.parkAndRide.unavailable}</p>
          ) : parkAndRides ? (
            <ParkAndRideList parkAndRides={parkAndRides} />
          ) : (
            <p style={muted}>{fr.parkAndRide.loading}</p>
          )}
        </div>
      )}
    </section>
  );
}
