"use client";

import { useNow, useTripDelays } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { formatClockTime, punctuality, sharedSelectionSearch, upcomingStops } from "@greline/services";
import { radii, toCssColor } from "@greline/theme";
import type { Line, Occupancy, Stop, TransitPattern, TransitTrip } from "@greline/types";
import { type ReactNode, type Ref, useEffect, useRef } from "react";
import { CHIP, chip, colors, panel, SIDE_PANEL } from "@/lib/theme-tokens";
import { OccupancyGauge } from "./occupancy-gauge";
import { CloseButton, SectionTitle, SkeletonRows } from "./panel-ui";
import { ShareButton } from "./share-button";

/** Upcoming stops move on as the vehicle does: a few seconds is enough between two looks. */
const CLOCK_TICK_MS = 5_000;

function PunctualityText({ delaySeconds }: { delaySeconds: number | undefined }) {
  const status = punctuality(delaySeconds);
  if (status.kind === "unknown") return <span style={{ color: colors.textMuted }}>{fr.vehicle.unknown}</span>;
  if (status.kind === "onTime") return <span>{fr.vehicle.onTime}</span>;
  if (status.kind === "early") return <span style={{ color: colors.warning }}>{fr.vehicle.early(status.minutes)}</span>;
  return <span style={{ color: colors.late }}>{fr.vehicle.late(status.minutes)}</span>;
}

function VehicleStatus({ delaySeconds, occupancy }: { delaySeconds: number | undefined; occupancy: Occupancy | undefined }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <PunctualityText delaySeconds={delaySeconds} />
      {occupancy && (
        <span className="inline-flex items-center gap-1.5" style={{ color: colors.textMuted }}>
          <OccupancyGauge occupancy={occupancy} />
          {fr.occupancy[occupancy]}
        </span>
      )}
    </p>
  );
}

function Message({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm" style={{ color: colors.textMuted }}>
      {children}
    </p>
  );
}

/** The followed vehicle as found in today's schedules. */
export interface FollowedTrip {
  trip: TransitTrip;
  pattern: TransitPattern;
  line: Line;
}

interface UpcomingStopListProps {
  followed: FollowedTrip;
  delaySeconds: number;
  stopsById: ReadonlyMap<string, Stop>;
  onShowStop: (stopId: string) => void;
}

/** The stops the vehicle has not left yet, with their estimated times, on a rail of the line's color. */
function UpcomingStopList({ followed: { trip, pattern, line }, delaySeconds, stopsById, onShowStop }: UpcomingStopListProps) {
  const now = useNow(CLOCK_TICK_MS);
  const stops = upcomingStops(trip, pattern, delaySeconds, now.getTime() / 1000);
  if (stops.length === 0) return <Message>{fr.vehicle.gone}</Message>;
  return (
    <>
      <SectionTitle>{fr.vehicle.nextStops}</SectionTitle>
      <ol className="border-l-4 pl-3" style={{ borderColor: toCssColor(line.color) }}>
        {stops.map(({ stopId, time }, i) => {
          const stop = stopsById.get(stopId);
          return (
            <li key={`${stopId}-${i}`}>
              <button
                type="button"
                disabled={!stop}
                onClick={() => onShowStop(stopId)}
                className="flex w-full items-baseline gap-2 rounded px-2 py-0.5 text-left text-sm hover:bg-[color-mix(in_srgb,var(--g-text)_8%,transparent)] focus-visible:outline-2"
              >
                <span className="min-w-0 flex-1 truncate">{stop?.name ?? stopId}</span>
                <span className="tabular-nums" style={{ color: colors.textMuted }}>
                  {formatClockTime(new Date(time * 1000))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function VehicleHeader({ vehicleKey, followed, closeRef, onClose }: { vehicleKey: string; followed: FollowedTrip | null; closeRef: Ref<HTMLButtonElement>; onClose: () => void }) {
  const title = followed && fr.vehicle.title(followed.line.shortName, followed.pattern.headsign);
  return (
    <div className="flex items-start gap-2">
      {followed && (
        <span
          aria-hidden
          className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center px-2 text-base font-bold"
          style={{ background: toCssColor(followed.line.color), color: toCssColor(followed.line.textColor), borderRadius: radii.pill }}
        >
          {followed.line.shortName}
        </span>
      )}
      <h2 id="vehicle-panel-title" className="min-w-0 flex-1 pt-1 text-base font-semibold leading-tight">
        {followed ? (
          <>
            <span className="sr-only">{title}</span>
            <span aria-hidden>{fr.vehicle.direction(followed.pattern.headsign)}</span>
          </>
        ) : (
          fr.vehicle.follow
        )}
      </h2>
      {title && <ShareButton name={title} search={sharedSelectionSearch({ kind: "vehicle", id: vehicleKey })} />}
      <CloseButton ref={closeRef} label={fr.vehicle.close} onClick={onClose} />
    </div>
  );
}

interface VehiclePanelProps {
  vehicleKey: string;
  /** Null while the schedules load, or when that trip does not run today. */
  followed: FollowedTrip | null;
  isPending: boolean;
  stopsById: ReadonlyMap<string, Stop>;
  following: boolean;
  onFollow: () => void;
  onShowStop: (stopId: string) => void;
  onClose: () => void;
}

/** One vehicle: its line and direction, delay, occupancy and next stops. Non-modal, like a stop's panel. */
export function VehiclePanel({ vehicleKey, followed, isPending, stopsById, following, onFollow, onShowStop, onClose }: VehiclePanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const readings = useTripDelays().data;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [vehicleKey, onClose]);

  const delaySeconds = followed ? readings?.delays[followed.trip.id] : undefined;
  return (
    <aside aria-labelledby="vehicle-panel-title" className={SIDE_PANEL} style={panel}>
      <VehicleHeader vehicleKey={vehicleKey} followed={followed} closeRef={closeButtonRef} onClose={onClose} />
      {followed ? (
        <>
          <VehicleStatus delaySeconds={delaySeconds} occupancy={readings?.occupancy[followed.trip.id]} />
          <div className="mt-3">
            <button type="button" aria-pressed={following} onClick={onFollow} className={CHIP} style={chip(following)}>
              {fr.vehicle.follow}
            </button>
          </div>
          <UpcomingStopList followed={followed} delaySeconds={delaySeconds ?? 0} stopsById={stopsById} onShowStop={onShowStop} />
        </>
      ) : (
        isPending ? <SkeletonRows label={fr.vehicle.loading} rows={4} /> : <Message>{fr.vehicle.gone}</Message>
      )}
    </aside>
  );
}
