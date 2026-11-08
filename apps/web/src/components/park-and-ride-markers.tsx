"use client";

import { useParkAndRides } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { formatClockTime, type ParkAndRideLevel, parkAndRideLevel } from "@greline/services";
import type { ParkAndRide } from "@greline/types";
import { useState } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { colors } from "@/lib/theme-tokens";
import { CloseButton } from "./panel-ui";

/** Same scale as traffic and air: green, amber, red; grey when nobody counts. */
export const PARK_AND_RIDE_COLOR: Record<ParkAndRideLevel, string> = {
  available: colors.success,
  almostFull: colors.warning,
  full: colors.danger,
  unknown: colors.textMuted,
};

function statusText(parkAndRide: ParkAndRide): string {
  const { free, capacity } = parkAndRide;
  if (free === null) return fr.parkAndRide.capacity(capacity);
  return free === 0 ? fr.parkAndRide.full(capacity) : fr.parkAndRide.free(free, capacity);
}

/** A "P+R" badge in the color of its level, with the free spaces when they are counted. */
function ParkAndRideButton({ parkAndRide, onOpen }: { parkAndRide: ParkAndRide; onOpen: () => void }) {
  const label = fr.parkAndRide.marker(parkAndRide.name, statusText(parkAndRide));
  return (
    <Marker longitude={parkAndRide.lon} latitude={parkAndRide.lat} anchor="center">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="flex cursor-pointer items-center gap-1 rounded-md border-2 px-1 py-px text-[11px] leading-tight font-bold text-white shadow focus-visible:outline-2"
        style={{ background: PARK_AND_RIDE_COLOR[parkAndRideLevel(parkAndRide)], borderColor: colors.station }}
      >
        {fr.parkAndRide.toggle}
        {parkAndRide.free !== null && <span className="tabular-nums">{parkAndRide.free}</span>}
      </button>
    </Marker>
  );
}

function ParkAndRideCard({ parkAndRide, onClose }: { parkAndRide: ParkAndRide; onClose: () => void }) {
  const level = parkAndRideLevel(parkAndRide);
  return (
    <Popup longitude={parkAndRide.lon} latitude={parkAndRide.lat} anchor="bottom" offset={14} closeButton={false} onClose={onClose} maxWidth="16rem">
      <div className="p-3 text-sm">
        <div className="flex items-start gap-1">
          <div className="mr-auto min-w-0">
            <p className="font-semibold leading-tight">{parkAndRide.name}</p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              {parkAndRide.city}
            </p>
          </div>
          <CloseButton label={fr.parkAndRide.close} onClick={onClose} />
        </div>
        <p className="mt-2 font-semibold" style={{ color: level === "unknown" ? colors.text : PARK_AND_RIDE_COLOR[level] }}>
          {statusText(parkAndRide)}
        </p>
        <p className="text-xs" style={{ color: colors.textMuted }}>
          {parkAndRide.updatedAt ? fr.parkAndRide.countedAt(formatClockTime(new Date(parkAndRide.updatedAt))) : fr.parkAndRide.noLiveCount}
        </p>
      </div>
    </Popup>
  );
}

/** The P+R car parks on the map; a click opens the one's card. Fetched only while shown. */
export function ParkAndRideMarkers() {
  const { data: parkAndRides } = useParkAndRides();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = parkAndRides?.find((p) => p.id === openId);
  return (
    <>
      {parkAndRides?.map((parkAndRide) => (
        <ParkAndRideButton key={parkAndRide.id} parkAndRide={parkAndRide} onOpen={() => setOpenId(parkAndRide.id)} />
      ))}
      {open && <ParkAndRideCard parkAndRide={open} onClose={() => setOpenId(null)} />}
    </>
  );
}
